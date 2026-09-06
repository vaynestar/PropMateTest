"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { normaliseVisitorStatus } from "@/lib/visitor-status";

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
    const status = normaliseVisitorStatus(formData.get("status") as string) || "Approved";

    if (!visitor_name || !visitor_ic_no || !visit_date_str) {
      throw new Error("Enter the visitor's name, IC or passport number, and the date of the visit.");
    }

    const visitDate = new Date(visit_date_str);
    if (isNaN(visitDate.getTime())) {
      throw new Error("That visit date is not valid.");
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
        visit_date: visitDate,
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

    /*
     * This used to write whatever string it was handed - no validation at all,
     * unlike updateTicketStatus - and it stamped check_in_time or
     * check_out_time on every save, so re-saving a checked-in visitor moved
     * their arrival time. It also allowed Approved -> Checked Out directly,
     * producing a departure with no arrival, and Checked Out -> Checked In,
     * leaving both timestamps set and the record self-contradictory.
     */
    const next = normaliseVisitorStatus(status);
    if (!next) {
      return { error: `"${status}" is not a visitor status.` };
    }

    const visitor = await prisma.visitor.findUnique({
      where: { visitor_id: visitorId },
      select: { status: true, check_in_time: true, visitor_name: true },
    });
    if (!visitor) return { error: "That visitor pass no longer exists." };

    const current = normaliseVisitorStatus(visitor.status) ?? "Approved";

    if (next === "Checked Out" && current !== "Checked In") {
      return {
        error: `${visitor.visitor_name} has not been checked in, so there is nothing to check out.`,
      };
    }
    if (next === "Checked In" && current === "Checked Out") {
      return {
        error: `${visitor.visitor_name} has already left. Register a new pass for a return visit.`,
      };
    }
    if (next === "Cancelled" && current === "Checked In") {
      return {
        error: `${visitor.visitor_name} is on site. Check them out instead of cancelling the pass.`,
      };
    }

    const dataToUpdate: any = {
      status: next,
      modified_by: user.userId,
    };

    // Stamped only on the transition, so the times record when it happened
    // rather than when the row was last touched.
    if (next === "Checked In" && current !== "Checked In") {
      dataToUpdate.check_in_time = new Date();
      dataToUpdate.check_out_time = null;
    } else if (next === "Checked Out" && current !== "Checked Out") {
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
