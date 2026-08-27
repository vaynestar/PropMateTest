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

    const property_id = (formData.get("property_id") as string) || null;
    const lease_id = (formData.get("lease_id") as string) || null;
    const visitor_type = (formData.get("visitor_type") as string) || "General";
    const visitor_name = (formData.get("visitor_name") as string)?.trim();
    const visitor_ic_no = (formData.get("visitor_ic_no") as string)?.trim();
    const contact_no = (formData.get("contact_no") as string)?.trim() || null;
    const vehicle_plate = (formData.get("vehicle_plate") as string)?.trim() || null;
    const destination = (formData.get("destination") as string)?.trim() || null;
    const visit_purpose = (formData.get("visit_purpose") as string)?.trim() || null;
    const visit_date_str = (formData.get("visit_date") as string) || null;
    const status = (formData.get("status") as string) || "Approved";

    if (!visitor_name || !visitor_ic_no || !visit_date_str) {
      throw new Error("Required fields missing: Please provide visitor name, IC/Passport, and visit date.");
    }

    // Auto-resolve property_id if not explicitly provided but lease_id is selected
    let resolvedPropertyId = property_id;
    if (!resolvedPropertyId && lease_id) {
      const lease = await prisma.tenantLease.findUnique({
        where: { lease_id },
        include: { unit: true },
      });
      if (lease?.unit?.property_id) {
        resolvedPropertyId = lease.unit.property_id;
      }
    }

    await prisma.visitor.create({
      data: {
        property_id: resolvedPropertyId,
        lease_id: lease_id || null,
        visitor_type,
        visitor_name,
        visitor_ic_no,
        contact_no,
        vehicle_plate,
        destination: destination || (lease_id ? "Resident Unit" : "General Property"),
        visit_purpose,
        visit_date: new Date(visit_date_str),
        status,
        check_in_time: status === "Checked In" ? new Date() : null,
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

    const dataToUpdate: any = {
      status,
      modified_by: user.userId,
    };

    if (status === "Checked In") {
      dataToUpdate.check_in_time = new Date();
    } else if (status === "Checked Out" || status === "Completed") {
      dataToUpdate.check_out_time = new Date();
    }

    await prisma.visitor.update({
      where: { visitor_id: visitorId },
      data: dataToUpdate,
    });

    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
