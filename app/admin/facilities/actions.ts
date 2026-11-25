"use server";

import { requireUser } from "@/lib/auth";
import { checkAnnouncementLink } from "@/lib/storage/urls";
import {
  createFacility,
  updateFacility,
  deleteFacility,
} from "@/lib/facility-management";
import { revalidatePath } from "next/cache";
import { closureLabel } from "@/lib/facility-closure";
import prisma from "@/lib/prisma";
import { dayMonth } from "@/lib/short-date";

/**
 * Facility photo (DEV-184): an uploaded file (/api/files/...) or an https
 * link, same rule as announcement photos. undefined = field not on the form.
 */
function readPhoto(formData: FormData): { ok: true; value: string | null | undefined } | { ok: false } {
  if (!formData.has("image_url")) return { ok: true, value: undefined };
  const checked = checkAnnouncementLink(String(formData.get("image_url") ?? ""));
  return checked.ok ? { ok: true, value: checked.value } : { ok: false };
}
const PHOTO_ERROR = "The photo must be an uploaded file or a web link starting with https://.";

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

    const photo = readPhoto(formData);
    if (!photo.ok) return { error: PHOTO_ERROR };

    await createFacility(
      {
        property_id: propertyId,
        image_url: photo.value ?? null,
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

    const photo = readPhoto(formData);
    if (!photo.ok) return { error: PHOTO_ERROR };

    await updateFacility(
      id,
      {
        image_url: photo.value,
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
/**
 * Set when the next service is due, without claiming one has happened (DEV-288).
 *
 * `logMaintenanceAction` below is the only way the next-due date could be set,
 * and it requires `performed_on` and `description` and writes a
 * `facilityMaintenance` row. So scheduling the first service on a facility
 * that has never been serviced meant inventing a service visit — user:
 * "if i never need mainteance before, i cant just log a service by today, i
 * just want to set nexct mainteance date".
 *
 * That is not only awkward, it falsifies the record: the service history
 * feeds the schedule, the facilities report and "Last serviced", and a
 * fabricated row corrupts all three. Scheduling and recording are two
 * different claims, so they are two different actions. This one touches the
 * facility and writes no history.
 *
 * Clearing the date is allowed — an empty value means "not scheduled", which
 * is a real answer and the state every new facility starts in.
 */
export async function scheduleNextServiceAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const facility_id = String(formData.get("facility_id") || "").trim();
    const next_due = String(formData.get("next_due") || "").trim();
    if (!facility_id) return { error: "Facility is missing." };

    let nextDueDate: Date | null = null;
    if (next_due) {
      nextDueDate = new Date(next_due);
      if (isNaN(nextDueDate.getTime())) return { error: "That date is not valid." };
    }

    const facility = await prisma.facility.findUnique({
      where: { facility_id },
      select: { facility_name: true },
    });
    if (!facility) return { error: "That facility no longer exists." };

    await prisma.facility.update({
      where: { facility_id },
      data: { next_maintenance_date: nextDueDate, modified_by: user.userId },
    });

    revalidatePath("/admin/facilities");
    revalidatePath("/admin");
    return {
      success: true,
      message: nextDueDate
        ? `${facility.facility_name} is next due ${dayMonth(nextDueDate, true)}. It cannot be booked that day.`
        : `${facility.facility_name} has no service scheduled.`,
    };
  } catch (error: any) {
    return { error: error?.message || "Could not save the date." };
  }
}

/**
 * Close a facility for a stretch of days, or reopen it (DEV-289).
 *
 * Separate from `toggleMaintenanceAction`, which flips `facility_status` to
 * "Maintenance" and means *closed until somebody remembers to undo it* — no
 * dates, no reason, and nothing a resident can be told. This one is bounded
 * and explains itself.
 *
 * A daily window: shut between the two times on every day in the range, open
 * outside them. Leave both times empty for whole days.
 */
export async function setFacilityClosureAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const facility_id = String(formData.get("facility_id") || "").trim();
    if (!facility_id) return { error: "Facility is missing." };

    const facility = await prisma.facility.findUnique({
      where: { facility_id },
      select: { facility_name: true },
    });
    if (!facility) return { error: "That facility no longer exists." };

    // "Reopen it" posts the same form with the dates cleared.
    if (formData.get("clear") === "true") {
      await prisma.facility.update({
        where: { facility_id },
        data: {
          closed_from: null,
          closed_until: null,
          closed_start_time: null,
          closed_end_time: null,
          closure_reason: null,
          modified_by: user.userId,
        },
      });
      revalidatePath("/admin/facilities");
      revalidatePath("/admin/bookings");
      revalidatePath("/resident/facilities");
      return { success: true, message: `${facility.facility_name} is open again.` };
    }

    const from = String(formData.get("closed_from") || "").trim();
    const until = String(formData.get("closed_until") || "").trim();
    const startTime = String(formData.get("closed_start_time") || "").trim();
    const endTime = String(formData.get("closed_end_time") || "").trim();
    const reason = String(formData.get("closure_reason") || "").trim();

    if (!from || !until) return { error: "Give both the first and the last day it is closed." };
    const fromDate = new Date(from);
    const untilDate = new Date(until);
    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return { error: "Those dates are not valid." };
    }
    if (untilDate < fromDate) return { error: "The last day cannot be before the first." };

    // Either both times or neither: one alone cannot describe a window, and
    // silently treating it as a whole-day closure would shut more than asked.
    if (!!startTime !== !!endTime) {
      return {
        error: "Give both a start and an end time, or leave both empty to close the whole day.",
      };
    }
    if (startTime && endTime && endTime <= startTime) {
      return { error: "The closing window must end after it starts." };
    }

    await prisma.facility.update({
      where: { facility_id },
      data: {
        closed_from: fromDate,
        closed_until: untilDate,
        closed_start_time: startTime || null,
        closed_end_time: endTime || null,
        closure_reason: reason || null,
        modified_by: user.userId,
      },
    });

    revalidatePath("/admin/facilities");
    revalidatePath("/admin/bookings");
    revalidatePath("/resident/facilities");

    const label = closureLabel({
      closed_from: fromDate,
      closed_until: untilDate,
      closed_start_time: startTime || null,
      closed_end_time: endTime || null,
    });
    return {
      success: true,
      message: `${facility.facility_name} is closed ${label}. Bookings in those hours are refused.`,
    };
  } catch (error: any) {
    return { error: error?.message || "Could not save the closure." };
  }
}

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
        ? `Logged for ${facility.facility_name}. Next service due ${dayMonth(nextDueDate, true)}.`
        : `Logged for ${facility.facility_name}. No next service scheduled.`,
    };
  } catch (error: any) {
    console.error("logMaintenanceAction error:", error);
    return { error: error?.message || "Could not save the maintenance record." };
  }
}
