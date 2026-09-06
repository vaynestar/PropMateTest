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

    // Every status test here went through its own spelling of the same four
    // states - Completed, Cancelled, Declined, Rejected - so a pass written
    // with one spelling was judged by code checking another. All four now
    // resolve through lib/visitor-status.ts.
    const current = normaliseVisitorStatus(visitor.status);

    // 1. If already Checked In -> Prompt warning with Check-Out option
    if (current === "Checked In") {
      const checkInFormatted = visitor.check_in_time
        ? new Date(visitor.check_in_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })
        : "earlier today";

      return {
        success: false,
        isAlreadyCheckedIn: true,
        error: `QR Pass Already Used for Check-In: Visitor "${visitor.visitor_name}" was already checked in at ${checkInFormatted}.`,
        visitor,
      };
    }

    // 2. If already Checked Out -> Expired single-entry pass
    if (current === "Checked Out") {
      const checkOutFormatted = visitor.check_out_time
        ? new Date(visitor.check_out_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })
        : "earlier";

      return {
        success: false,
        isAlreadyCheckedOut: true,
        error: `Pass Expired / Completed: Visitor "${visitor.visitor_name}" was already checked out at ${checkOutFormatted}. This single-entry pass cannot be reused.`,
        visitor,
      };
    }

    // 3. Cancelled passes never admit anyone.
    if (current === "Cancelled") {
      return {
        success: false,
        error: `This pass was cancelled. ${visitor.visitor_name} cannot be let in on it.`,
        visitor,
      };
    }

    // 4. Perform Valid Check-In
    const updatedVisitor = await prisma.visitor.update({
      where: { visitor_id: visitorId },
      data: {
        status: "Checked In",
        check_in_time: new Date(),
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
    return { success: true, action: "CHECKED_IN", visitor: updatedVisitor };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process QR verification." };
  }
}

export async function checkOutVisitorById(visitorId: string) {
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

    const updatedVisitor = await prisma.visitor.update({
      where: { visitor_id: visitorId },
      data: {
        status: "Checked Out",
        check_out_time: new Date(),
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
