"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateMonthlyInvoices } from "@/lib/billing";

export async function generateInvoicesAction() {
  const user = await requireUser(["Admin"]);
  await generateMonthlyInvoices(user.userId);
  revalidatePath("/admin/invoices");
}
