"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function checkInVisitorByQR(visitorId: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized" };
    }

    const visitor = await prisma.visitor.findUnique({
      where: { visitor_id: visitorId },
    });

    if (!visitor) {
      return { success: false, error: "Invalid QR Code: Visitor not found" };
    }

    if (visitor.status === "Checked In") {
      return { success: false, error: "Visitor is already checked in" };
    }

    if (visitor.status !== "Approved") {
      return { success: false, error: `Visitor status is ${visitor.status}. Must be Approved.` };
    }

    await prisma.visitor.update({
      where: { visitor_id: visitorId },
      data: { status: "Checked In" },
    });

    revalidatePath("/admin/visitors");
    return { success: true, visitor };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
