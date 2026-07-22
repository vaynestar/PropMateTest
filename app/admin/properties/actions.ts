"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createProperty, deleteProperty } from "@/lib/property-management";

export async function addProperty(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const input = {
      property_name: String(formData.get("property_name")),
      property_type: String(formData.get("property_type")),
      address: String(formData.get("address")),
      city: String(formData.get("city")),
      state: String(formData.get("state")),
      country: String(formData.get("country")),
      postal_code: String(formData.get("postal_code")),
      total_units: "0",
    };
    
    await createProperty(input, user.userId);
    revalidatePath("/admin/properties");
    return { success: true, message: "Property added successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to create property" };
  }
}

export async function removeProperty(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const id = String(formData.get("property_id"));
    await deleteProperty(id);
    revalidatePath("/admin/properties");
    return { success: true, message: "Property deleted successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to delete property" };
  }
}
