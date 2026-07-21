"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateMonthlyInvoices, markInvoicePaid } from "@/lib/billing";

export async function generateInvoicesAction() {
  const user = await requireUser(["Admin"]);
  const result = await generateMonthlyInvoices(user.userId);
  revalidatePath("/admin/invoices");
  return result;
}

export async function markInvoicePaidAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const id = String(formData.get("invoice_id"));
  await markInvoicePaid(id, user.userId);
  revalidatePath("/admin/invoices");
}
