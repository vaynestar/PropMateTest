"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { addTicketMessage, getTicketThread, type TicketThread } from "@/lib/ticket-thread";

/** Resident: open one of their own requests with its conversation (DEV-189). */
export async function residentTicketThread(ticketId: string): Promise<{ thread?: TicketThread; error?: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "Resident") return { error: "Please sign in again." };
  const thread = await getTicketThread(String(ticketId), user);
  return thread ? { thread } : { error: "That request no longer exists." };
}

/** Resident: reply on their own request, optionally with photos. */
export async function residentTicketReply(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "Resident") return { error: "Please sign in again." };
  const res = await addTicketMessage({
    ticketId: String(formData.get("ticket_id") || ""),
    viewer: user,
    text: String(formData.get("message") || ""),
    attachments: formData.getAll("attachment"),
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/resident/maintenance");
  return { ok: true };
}
