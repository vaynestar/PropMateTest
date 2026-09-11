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

    // The directory's own buttons are a gate crossing too, so they belong in
    // the movement log alongside the scans.
    if (dataToUpdate.check_in_time || dataToUpdate.check_out_time) {
      await prisma.visitorMovement.create({
        data: {
          visitor_id: visitorId,
          direction: dataToUpdate.check_in_time ? "In" : "Out",
          occurred_at: dataToUpdate.check_in_time ?? dataToUpdate.check_out_time,
          method: "Manual",
          recorded_by: user.userId,
        },
      });
    }

    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Correct a visitor record.
 *
 * Visitors had create and status-change only, so a mistyped IC or plate was
 * permanent - and the IC is exactly what the guard matches against the card in
 * the visitor's hand (DEV-153).
 *
 * What may change depends on where the visit is, and the rule lives here rather
 * than in the form, because a form is not a guard:
 *   - Expected (Approved): everything.
 *   - On site / Left: not the name or IC. Amending who is standing at the gate
 *     mid-visit, or who was admitted last week, is not a correction - it is a
 *     different person, and the gate log (visitor_movements) would then record
 *     a crossing by someone who never crossed. Contact, plate, purpose and
 *     destination can still be fixed; a guard who misread a plate should be
 *     able to put it right.
 *   - Cancelled: nothing. It is a closed record.
 */
export async function adminUpdateVisitor(visitorId: string, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") throw new Error("Unauthorized");

    const current = await prisma.visitor.findUnique({ where: { visitor_id: visitorId } });
    if (!current) throw new Error("That visitor record no longer exists.");

    const state = normaliseVisitorStatus(current.status);
    if (state === "Cancelled") {
      throw new Error("This pass was cancelled. Register a new visit instead of editing it.");
    }
    const identityLocked = state === "Checked In" || state === "Checked Out";

    const text = (key: string) => {
      const v = formData.get(key);
      return typeof v === "string" ? v.trim() : "";
    };

    const data: Record<string, unknown> = {
      contact_no: text("contact_no") || null,
      vehicle_plate: text("vehicle_plate").toUpperCase() || null,
      visit_purpose: text("visit_purpose") || null,
      destination: text("destination") || null,
      modified_by: user.userId,
    };

    if (identityLocked) {
      // Refuse rather than silently ignore: a caller that sends a new name for
      // someone already on site should hear no, not believe it was saved.
      const name = text("visitor_name");
      const ic = text("visitor_ic_no");
      if ((name && name !== current.visitor_name) || (ic && ic !== current.visitor_ic_no)) {
        throw new Error(
          "The name and IC cannot be changed after the visitor has arrived. If the wrong person was admitted, check them out and register the right one."
        );
      }
    } else {
      const name = text("visitor_name");
      const ic = text("visitor_ic_no");
      const dateStr = text("visit_date");
      if (!name || !ic || !dateStr) {
        throw new Error("Enter the visitor's name, IC or passport number, and the date of the visit.");
      }
      const visitDate = new Date(dateStr);
      if (isNaN(visitDate.getTime())) throw new Error("That visit date is not valid.");

      data.visitor_name = name;
      data.visitor_ic_no = ic;
      data.visit_date = visitDate;
      // visitor_type is deliberately not editable: it decides whether the visit
      // hangs off a resident's lease or a free-text destination, so changing it
      // is re-registering, not correcting.
    }

    await prisma.visitor.update({ where: { visitor_id: visitorId }, data });

    revalidatePath("/admin/visitors");
    return { success: true };
  } catch (error: any) {
    return { error: error.message as string };
  }
}
