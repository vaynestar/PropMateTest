"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function registerVisitor(state: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Resident") {
      throw new Error("Unauthorized");
    }

    // Get active lease for resident
    const lease = await prisma.tenantLease.findFirst({
      where: { user_id: user.userId, status: "Active" },
    });

    if (!lease) {
      throw new Error("No active lease found to register a visitor");
    }

    const visitor_name = formData.get("visitor_name") as string;
    const visitor_ic_no = formData.get("visitor_ic_no") as string;
    const vehicle_plate = formData.get("vehicle_plate") as string;
    const visit_purpose = formData.get("visit_purpose") as string;
    const visit_date_str = formData.get("visit_date") as string;

    if (!visitor_name || !visitor_ic_no || !visit_date_str) {
      throw new Error("Required fields missing");
    }

    await prisma.visitor.create({
      data: {
        lease_id: lease.lease_id,
        visitor_name,
        visitor_ic_no,
        vehicle_plate,
        visit_purpose,
        visit_date: new Date(visit_date_str),
        status: "Pending",
        created_by: user.userId,
      },
    });

    revalidatePath("/resident/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
