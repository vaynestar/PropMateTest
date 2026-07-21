"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateTicketStatus } from "@/lib/maintenance";

export async function updateStatusAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const ticketId = String(formData.get("ticket_id"));
  const status = String(formData.get("status"));
  
  await updateTicketStatus(ticketId, status, user.userId);
  revalidatePath("/admin/maintenance");
}
