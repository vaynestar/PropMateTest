"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateTicketStatus } from "@/lib/maintenance";

export async function updateTicketAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const ticketId = String(formData.get("ticket_id"));
  const status = String(formData.get("status"));
  const costStr = formData.get("cost");
  const cost = costStr ? parseFloat(String(costStr)) : undefined;
  const assignedTo = formData.get("assigned_to") ? String(formData.get("assigned_to")) : undefined;
  
  await updateTicketStatus(ticketId, status, user.userId, cost, assignedTo);
  revalidatePath("/admin/maintenance");
}
