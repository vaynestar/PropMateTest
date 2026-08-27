"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function checkInVisitorByQR(rawQrData: string) {
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
      return { success: false, error: "QR Code not recognized: No visitor record found." };
    }

    if (visitor.status === "Checked In") {
      return {
        success: false,
        error: `Visitor "${visitor.visitor_name}" was already checked in${
          visitor.check_in_time
            ? ` at ${new Date(visitor.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : ""
        }.`,
        visitor,
      };
    }

    if (visitor.status === "Cancelled" || visitor.status === "Declined" || visitor.status === "Rejected") {
      return {
        success: false,
        error: `Visitor pass is ${visitor.status}. Entry not permitted.`,
        visitor,
      };
    }

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
    return { success: true, visitor: updatedVisitor };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process QR check-in." };
  }
}
