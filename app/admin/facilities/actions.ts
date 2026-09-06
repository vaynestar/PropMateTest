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
        facility_status: String(formData.get("facility_status")),
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

    await updateFacility(
      id,
      {
        facility_status: nextStatus,
        is_bookable: nextStatus === "Available",
      },
      user.userId
    );

    revalidatePath("/admin/facilities");
    return {
      success: true,
      message: `Facility status changed to ${nextStatus === "Maintenance" ? "Under Maintenance" : "Available"}.`,
    };
  } catch (error: any) {
    console.error("toggleMaintenanceAction error:", error);
    return { error: error?.message || "Failed to update maintenance status." };
  }
}
