"use server";

import { requireUser } from "@/lib/auth";
import {
  createFacility,
  updateFacility,
  deleteFacility,
} from "@/lib/facility-management";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function addFacilityAction(formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const days = formData.getAll("operation_days").map(String);
    const nextMaint = formData.get("next_maintenance_date");
    const isMaint = formData.get("is_under_maintenance") === "on";
    const capacityStr = formData.get("max_capacity");
    let propertyId = String(formData.get("property_id") || "").trim();
    const facilityName = String(formData.get("facility_name") || "").trim();

    if (!facilityName) {
      return { error: "Facility name is required." };
    }

    if (!propertyId || propertyId === "undefined" || propertyId === "null") {
      const firstProp = await prisma.propertyMaster.findFirst({ select: { property_id: true } });
      if (!firstProp) {
        return { error: "No properties found in database. Please create a property first." };
      }
      propertyId = firstProp.property_id;
    }

    const openTime = String(formData.get("open_time") || "08:00");
    const closeTime = String(formData.get("close_time") || "22:00");

    await createFacility(
      {
        property_id: propertyId,
        facility_name: facilityName,
        facility_type: String(formData.get("facility_type") || "General"),
        facility_status: isMaint ? "Maintenance" : "Available",
        max_capacity: capacityStr && Number(capacityStr) > 0 ? Number(capacityStr) : null,
        is_bookable: formData.get("is_bookable") === "on" && !isMaint,
        operation_days: days.length > 0 ? days.join(",") : "1,2,3,4,5,6,7",
        open_time: openTime,
        close_time: closeTime,
        max_booking_hours: formData.get("max_booking_hours") ? Number(formData.get("max_booking_hours")) : null,
        next_maintenance_date: nextMaint && String(nextMaint).trim() !== "" ? String(nextMaint) : null,
      },
      user.userId
    );

    revalidatePath("/admin/facilities");
    return { success: true, message: `"${facilityName}" added. Residents can book it if you marked it bookable.` };
  } catch (error: any) {
    console.error("addFacilityAction error:", error);
    return { error: error?.message || "Failed to add facility. Please check your inputs." };
  }
}

export async function editFacilityAction(formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const id = String(formData.get("facility_id") || "").trim();
    if (!id) return { error: "Facility ID is missing." };

    const days = formData.getAll("operation_days").map(String);
    const nextMaint = formData.get("next_maintenance_date");
    const capacityStr = formData.get("max_capacity");
    const facilityName = String(formData.get("facility_name") || "").trim();

    if (!facilityName) {
      return { error: "Facility name cannot be empty." };
    }

    await updateFacility(
      id,
      {
        facility_name: facilityName,
        facility_type: String(formData.get("facility_type") || "General"),
        // facility_status is NOT set here. It has a dedicated control on the
        // card (Close for maintenance / Reopen) and is cleared when a service
        // is logged; a second door on the edit form only invited the two to
        // disagree. Its dropdown also offered "Inactive", a value nothing in
        // the app read - picking it changed nothing but made the field lie.
        max_capacity: capacityStr === "" ? null : Number(capacityStr),
        operation_days: days.length > 0 ? days.join(",") : "1,2,3,4,5,6,7",
        open_time: String(formData.get("open_time") || "08:00"),
        close_time: String(formData.get("close_time") || "22:00"),
        is_bookable: formData.get("is_bookable") === "on",
        max_booking_hours: formData.get("max_booking_hours") === "" ? null : (formData.get("max_booking_hours") ? Number(formData.get("max_booking_hours")) : undefined),
        next_maintenance_date: nextMaint && String(nextMaint).trim() !== "" ? String(nextMaint) : null,
      },
      user.userId
    );

    revalidatePath("/admin/facilities");
    return { success: true, message: `"${facilityName}" saved.` };
  } catch (error: any) {
    console.error("editFacilityAction error:", error);
    return { error: error?.message || "Failed to update facility details." };
  }
}

export async function deleteFacilityAction(facilityId: string) {
  try {
    const user = await requireUser(["Admin"]);
    const id = facilityId.trim();
    if (!id) return { error: "Facility ID is missing." };

    await deleteFacility(id);
    revalidatePath("/admin/facilities");
    return { success: true, message: "Facility removed." };
  } catch (error: any) {
    console.error("deleteFacilityAction error:", error);
    return { error: error?.message || "Failed to delete facility." };
  }
}

export async function toggleMaintenanceAction(facilityId: string, currentStatus: string) {
  try {
    const user = await requireUser(["Admin"]);
    const id = facilityId.trim();
    if (!id) return { error: "Facility ID is missing." };

    const nextStatus = currentStatus === "Maintenance" ? "Available" : "Maintenance";

    // is_bookable is deliberately NOT touched. It is policy - whether residents
    // may ever book this thing - while facility_status is a temporary closure.
    // Deriving one from the other meant reopening a lift or a corridor after
    // maintenance silently marked it bookable by residents.
    await updateFacility(id, { facility_status: nextStatus }, user.userId);

    revalidatePath("/admin/facilities");
    return {
      success: true,
      message: nextStatus === "Maintenance"
        ? "Closed for maintenance. Residents cannot book it until you reopen it."
        : "Reopened.",
    };
  } catch (error: any) {
    console.error("toggleMaintenanceAction error:", error);
    return { error: error?.message || "Failed to update maintenance status." };
  }
}

/**
 * Record a completed maintenance visit.
 *
 * `next_maintenance_date` is a single overwritable field, so before this the
 * only way to clear an overdue facility was to hand-edit that date — which
 * destroyed the previous one and left no evidence the work had happened. This
 * writes the visit to the log and rolls the schedule forward in one step, so
 * the overdue indicator has a way to be closed honestly.
 *
 * Reopening the facility is part of the same act when it was closed for the
 * work: finishing the job and leaving it shut is never what you meant.
 */
export async function logMaintenanceAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);

    const facility_id = String(formData.get("facility_id") || "").trim();
    const performed_on = String(formData.get("performed_on") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const performed_by = String(formData.get("performed_by") || "").trim();
    const next_due = String(formData.get("next_due") || "").trim();
    const reopen = formData.get("reopen") === "on" || formData.get("reopen") === "true";

    if (!facility_id) return { error: "Facility is missing." };
    if (!performed_on) return { error: "Enter the date the work was done." };
    if (!description) return { error: "Say what was done, even briefly." };

    const performedDate = new Date(performed_on);
    if (isNaN(performedDate.getTime())) return { error: "That date is not valid." };

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (performedDate > today) {
      return { error: "A maintenance record is a record of work already done." };
    }

    const nextDueDate = next_due ? new Date(next_due) : null;
    if (nextDueDate && isNaN(nextDueDate.getTime())) {
      return { error: "That next-due date is not valid." };
    }
    if (nextDueDate && nextDueDate < performedDate) {
      return { error: "The next service cannot be due before this one was done." };
    }

    const facility = await prisma.facility.findUnique({
      where: { facility_id },
      select: { facility_name: true, facility_status: true },
    });
    if (!facility) return { error: "That facility no longer exists." };

    await prisma.$transaction(async (tx) => {
      await tx.facilityMaintenance.create({
        data: {
          facility_id,
          performed_on: performedDate,
          description,
          performed_by: performed_by || null,
          next_due: nextDueDate,
          created_by: user.userId,
        },
      });

      await tx.facility.update({
        where: { facility_id },
        data: {
          next_maintenance_date: nextDueDate,
          ...(reopen && facility.facility_status === "Maintenance"
            ? { facility_status: "Available" }
            : {}),
          modified_by: user.userId,
        },
      });
    });

    revalidatePath("/admin/facilities");
    return {
      success: true,
      message: nextDueDate
        ? `Logged for ${facility.facility_name}. Next service due ${nextDueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`
        : `Logged for ${facility.facility_name}. No next service scheduled.`,
    };
  } catch (error: any) {
    console.error("logMaintenanceAction error:", error);
    return { error: error?.message || "Could not save the maintenance record." };
  }
}
