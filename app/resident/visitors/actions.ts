"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function registerVisitor(state: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Resident") {
      throw new Error("Unauthorized: Resident login required.");
    }

    // Get active lease for resident with unit relation
    const lease = await prisma.tenantLease.findFirst({
      where: { user_id: user.userId, status: "Active" },
      include: { unit: true },
    });

    if (!lease) {
      throw new Error("No active lease found to register a visitor.");
    }

    const visitor_name = (formData.get("visitor_name") as string)?.trim();
    const visitor_ic_no = (formData.get("visitor_ic_no") as string)?.trim();
    const contact_no = (formData.get("contact_no") as string)?.trim() || null;
    const vehicle_plate = (formData.get("vehicle_plate") as string)?.trim() || null;
    const visit_purpose = (formData.get("visit_purpose") as string)?.trim() || "Visiting Resident";
    const visit_date_str = (formData.get("visit_date") as string) || null;

    if (!visitor_name || !visitor_ic_no || !visit_date_str) {
      throw new Error("Required fields missing: Please provide name, IC/Passport, and visit date.");
    }

    await prisma.visitor.create({
      data: {
        property_id: lease.unit.property_id,
        lease_id: lease.lease_id,
        visitor_type: "Resident Guest",
        destination: `Unit ${lease.unit.unit_number}`,
        visitor_name,
        visitor_ic_no,
        contact_no,
        vehicle_plate,
        visit_purpose,
        visit_date: new Date(visit_date_str),
        status: "Approved",
        created_by: user.userId,
      },
    });

    revalidatePath("/resident/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
