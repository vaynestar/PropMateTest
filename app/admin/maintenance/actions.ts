"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateTicketStatus } from "@/lib/maintenance";

export async function updateTicketAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const ticketId = String(formData.get("ticket_id") || "");
  const status = String(formData.get("status") || "Open");
  const costStr = formData.get("cost");
  const cost = costStr !== null && String(costStr).trim() !== "" ? parseFloat(String(costStr)) : undefined;
  const assignedTo = formData.get("assigned_to") !== null ? String(formData.get("assigned_to")) : undefined;
  const remark = formData.get("remark") !== null ? String(formData.get("remark")) : undefined;

  try {
    await updateTicketStatus(ticketId, status, user.userId, cost, assignedTo, remark);
    revalidatePath("/admin/maintenance");
    return { success: true, message: "Ticket updated." };
  } catch (err: any) {
    return { error: err?.message || "Failed to update ticket." };
  }
}

export async function raiseTicketAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const { raiseTicket } = await import("@/lib/maintenance");

  const propertyId = String(formData.get("property_id") || "");
  const locationType = String(formData.get("location_type") || "Unit");
  const unitId = String(formData.get("unit_id") || "");
  const locationDetail = String(formData.get("location_detail") || "");
  const title = String(formData.get("title") || "");
  const description = String(formData.get("description") || "");
  const category = String(formData.get("ticket_category") || "");
  const priority = String(formData.get("priority") || "Medium");

  if (!title.trim()) return { error: "Please enter an issue title." };
  if (locationType === "Unit" && !unitId) {
    return { error: "Please select a unit or choose Common Area." };
  }
  if (locationType === "Common Area" && !locationDetail.trim()) {
    return { error: "Please provide the common area location details (e.g. Level 3 Hallway, Lift Lobby B)." };
  }

  try {
    await raiseTicket({
      property_id: propertyId && propertyId !== "ALL" ? propertyId : undefined,
      unit_id: locationType === "Unit" ? unitId : undefined,
      location_type: locationType,
      location_detail: locationDetail,
      requester_id: user.userId,
      title,
      description,
      ticket_category: category,
      priority,
      createdBy: user.userId,
    });
    revalidatePath("/admin/maintenance");
    return { success: true, message: `Ticket raised: "${title}".` };
  } catch (err: any) {
    return { error: err?.message || "Failed to raise ticket." };
  }
}

export async function addCategoryAction(formData: FormData) {
  await requireUser(["Admin"]);
  const { createTicketCategory } = await import("@/lib/maintenance");
  const name = String(formData.get("category_name") || "");
  const description = String(formData.get("description") || "");

  if (!name.trim()) return { error: "Category name is required." };

  try {
    await createTicketCategory(name, description);
    revalidatePath("/admin/maintenance");
    return { success: true, message: `"${name}" added. It is now offered on both ticket forms.` };
  } catch (err: any) {
    return { error: err?.message || "Failed to create category." };
  }
}

export async function toggleCategoryAction(categoryId: string, isActive: boolean) {
  await requireUser(["Admin"]);
  const { toggleTicketCategory } = await import("@/lib/maintenance");
  try {
    await toggleTicketCategory(categoryId, isActive);
    revalidatePath("/admin/maintenance");
    return { success: true, message: "Saved." };
  } catch (err: any) {
    return { error: err?.message || "Could not update the category." };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  await requireUser(["Admin"]);
  const { deleteTicketCategory } = await import("@/lib/maintenance");
  try {
    await deleteTicketCategory(categoryId);
    revalidatePath("/admin/maintenance");
    return { success: true, message: "Category deleted." };
  } catch (err: any) {
    // The guard in deleteTicketCategory explains why, so pass it through.
    return { error: err?.message || "Could not delete the category." };
  }
}
