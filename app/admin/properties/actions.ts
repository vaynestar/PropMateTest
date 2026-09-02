"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createProperty, updateProperty, deleteProperty } from "@/lib/property-management";

export async function addProperty(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const input = {
      property_name: String(formData.get("property_name") || ""),
      property_type: String(formData.get("property_type") || ""),
      address: String(formData.get("address") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      country: String(formData.get("country") || "Malaysia"),
      postal_code: String(formData.get("postal_code") || ""),
      total_units: Number(formData.get("total_units")) || 0,
    };
    
    await createProperty(input, user.userId);
    revalidatePath("/admin/properties");
    revalidatePath("/admin");
    return { success: true, message: "Property created successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to create property" };
  }
}

export async function editProperty(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const propertyId = String(formData.get("property_id") || "");
    if (!propertyId) throw new Error("Property ID is required");

    const input = {
      property_name: String(formData.get("property_name") || ""),
      property_type: String(formData.get("property_type") || ""),
      address: String(formData.get("address") || ""),
      city: String(formData.get("city") || ""),
      state: String(formData.get("state") || ""),
      country: String(formData.get("country") || "Malaysia"),
      postal_code: String(formData.get("postal_code") || ""),
      total_units: Number(formData.get("total_units")) || 0,
    };
    
    await updateProperty(propertyId, input, user.userId);
    revalidatePath("/admin/properties");
    revalidatePath("/admin");
    return { success: true, message: "Property updated successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to update property" };
  }
}

export async function removeProperty(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const id = String(formData.get("property_id") || "");
    if (!id) throw new Error("Property ID is required");

    await deleteProperty(id);
    revalidatePath("/admin/properties");
    revalidatePath("/admin");
    return { success: true, message: "Property deleted successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to delete property. Check if there are active units linked." };
  }
}
