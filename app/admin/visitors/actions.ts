"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function adminRegisterVisitor(state: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    const lease_id = formData.get("lease_id") as string;
    const visitor_name = formData.get("visitor_name") as string;
    const visitor_ic_no = formData.get("visitor_ic_no") as string;
    const vehicle_plate = formData.get("vehicle_plate") as string;
    const visit_purpose = formData.get("visit_purpose") as string;
    const visit_date_str = formData.get("visit_date") as string;
    const status = formData.get("status") as string || "Pending";

    if (!lease_id || !visitor_name || !visitor_ic_no || !visit_date_str) {
      throw new Error("Required fields missing");
    }

    await prisma.visitor.create({
      data: {
        lease_id,
        visitor_name,
        visitor_ic_no,
        vehicle_plate,
        visit_purpose,
        visit_date: new Date(visit_date_str),
        status,
        created_by: user.userId,
      },
    });

    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateVisitorStatus(visitorId: string, status: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    await prisma.visitor.update({
      where: { visitor_id: visitorId },
      data: { status },
    });

    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
