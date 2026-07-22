"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createUnit, deleteUnit } from "@/lib/unit-management";

export async function addUnit(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    await createUnit({
      property_id: formData.get("property_id") as string || null,
      unit_number: String(formData.get("unit_number")),
      unit_type: String(formData.get("unit_type")),
      floor_number: String(formData.get("floor_number")),
      area_sqft: String(formData.get("area_sqft")),
      monthly_rent: String(formData.get("monthly_rent") || "0"),
      status: String(formData.get("status")),
    });
    revalidatePath("/admin/units");
    return { success: true, message: "Unit added successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to add unit" };
  }
}

export async function removeUnit(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const unitId = String(formData.get("unit_id"));
    if (unitId) {
      await deleteUnit(unitId);
    }
    revalidatePath("/admin/units");
    return { success: true, message: "Unit deleted successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to delete unit" };
  }
}
