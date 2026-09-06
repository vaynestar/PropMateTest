"use server";

import prisma from "@/lib/prisma";
import { normaliseVisitorStatus } from "@/lib/visitor-status";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function scanVisitorQR(rawQrData: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access: Admin login required." };
    }

    if (!rawQrData || typeof rawQrData !== "string") {
      return { success: false, error: "Empty or invalid QR code data." };
    }

    // Extract UUID if full URL or JSON was encoded
    const trimmed = rawQrData.trim();
    const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    const visitorId = uuidMatch ? uuidMatch[0] : trimmed;

    const visitor = await prisma.visitor.findUnique({
      where: { visitor_id: visitorId },
      include: {
        property: true,
        lease: {
          include: {
            unit: { include: { property: true } },
            tenant: { select: { user_name: true, user_email: true, phone_number: true } },
          },
        },
      },
    });

    if (!visitor) {
      return { success: false, error: "QR Code not recognized: No visitor record found in database." };
    }

    /*
     * One scan, the right action.
     *
     * The gate pass used to be treated as entry-only: scanning it on the way
     * out returned an ERROR - "QR Pass Already Used for Check-In" - in red,
     * with the check-out hidden behind a second button the guard had to notice.
     * That is why three of fourteen visits in the data were still open, the
     * oldest nine days old: the exit scan looked like a failure, so nobody
     * completed it.
     *
     * A visitor pass has two halves. The scanner now performs whichever half is
     * next: an expected visitor is checked in, a visitor on site is checked
     * out. The guard scans once and reads a green screen either way; only a
     * genuinely unusable pass is an error.
     *
     * Every status test here also used its own spelling of the same four states
     * - Completed, Cancelled, Declined, Rejected - so a pass written with one
     * spelling was judged by code checking another. All resolve through
     * lib/visitor-status.ts now.
     */
    const current = normaliseVisitorStatus(visitor.status);

    // A cancelled pass never admits anyone.
    if (current === "Cancelled") {
      return {
        success: false,
        error: `This pass was cancelled. ${visitor.visitor_name} cannot be let in on it.`,
        visitor,
      };
    }

    // Single-entry: once the visit is closed the pass is spent.
    if (current === "Checked Out") {
      const checkOutFormatted = visitor.check_out_time
        ? new Date(visitor.check_out_time).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kuala_Lumpur",
          })
        : "earlier";

      return {
        success: false,
        isAlreadyCheckedOut: true,
        error: `${visitor.visitor_name} checked out at ${checkOutFormatted}. This pass is spent — issue a new one for another visit.`,
        visitor,
      };
    }

    const includeRelations = {
      property: true,
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { user_name: true, user_email: true, phone_number: true } },
        },
      },
    } as const;

    if (current === "Checked In") {
      /*
       * The second scan does NOT check the visitor out by itself.
       *
       * Auto check-out is the obvious reading of "scan on the way out", but it
       * makes a mis-scan silently wrong in the direction that matters: read the
       * wrong pass, or catch a pass in someone's pocket as they walk past, and
       * the board says a person has left while they are still in the building.
       * That is the exact failure this module exists to prevent.
       *
       * The old code went too far the other way and returned an ERROR, which is
       * why check-outs were being skipped. So: a success-coloured screen that
       * names the visitor and says how long they have been on site, with one
       * button. The guard sees who it is before the record changes.
       */
      const checkedInAt = visitor.check_in_time ? new Date(visitor.check_in_time) : null;
      const minutesOnSite = checkedInAt
        ? Math.floor((Date.now() - checkedInAt.getTime()) / 60_000)
        : null;

      return {
        success: false,
        awaitingCheckOut: true,
        minutesOnSite,
        // Under a minute is almost always the reader firing twice on arrival,
        // not somebody leaving. Say so; do not decide for the guard.
        justArrived: minutesOnSite !== null && minutesOnSite < 1,
        visitor,
      };
    }

    // Expected visitor arriving.
    const now = new Date();
    const [updatedVisitor] = await prisma.$transaction([
      prisma.visitor.update({
        where: { visitor_id: visitorId },
        data: {
          status: "Checked In",
          check_in_time: now,
          check_out_time: null,
          modified_by: user.userId,
        },
        include: includeRelations,
      }),
      // Appended, never rewritten: the columns above hold the current state,
      // this holds what actually happened and who recorded it.
      prisma.visitorMovement.create({
        data: {
          visitor_id: visitorId,
          direction: "In",
          occurred_at: now,
          method: "Scan",
          recorded_by: user.userId,
        },
      }),
    ]);

    revalidatePath("/admin/visitors");
    return { success: true, action: "CHECKED_IN", visitor: updatedVisitor };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process QR verification." };
  }
}

/** `method` records how the exit was captured: a scan, or a guard's button. */
export async function checkOutVisitorById(
  visitorId: string,
  method: "Scan" | "Manual" = "Manual"
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized access: Admin login required." };
    }

    const existing = await prisma.visitor.findUnique({
      where: { visitor_id: visitorId },
      select: { status: true, visitor_name: true },
    });
    if (!existing) {
      return { success: false, error: "That visitor pass no longer exists." };
    }
    if (normaliseVisitorStatus(existing.status) !== "Checked In") {
      return {
        success: false,
        error: `${existing.visitor_name} is not checked in, so there is nothing to check out.`,
      };
    }

    const outAt = new Date();
    await prisma.visitorMovement.create({
      data: {
        visitor_id: visitorId,
        direction: "Out",
        occurred_at: outAt,
        method,
        recorded_by: user.userId,
      },
    });

    const updatedVisitor = await prisma.visitor.update({
      where: { visitor_id: visitorId },
      data: {
        status: "Checked Out",
        check_out_time: outAt,
        modified_by: user.userId,
      },
      include: {
        property: true,
        lease: {
          include: {
            unit: { include: { property: true } },
            tenant: { select: { user_name: true, user_email: true, phone_number: true } },
          },
        },
      },
    });

    revalidatePath("/admin/visitors");
    return { success: true, action: "CHECKED_OUT", visitor: updatedVisitor };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process visitor checkout." };
  }
}

export async function checkInVisitorByQR(rawQrData: string) {
  return await scanVisitorQR(rawQrData);
}
