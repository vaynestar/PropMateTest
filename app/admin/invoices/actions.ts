"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateInvoicesForLeases, markInvoicePaid, getEligibleLeasesForInvoicing } from "@/lib/billing";
import prisma from "@/lib/prisma";

export async function getEligibleLeasesAction() {
  await requireUser(["Admin"]);
  return getEligibleLeasesForInvoicing();
}

export async function getAllActiveLeasesAction() {
  await requireUser(["Admin"]);
  return prisma.tenantLease.findMany({
    where: { status: "Active" },
    include: { tenant: true, unit: true }
  });
}

export async function generateInvoicesAction(leaseIds: string[]) {
  const user = await requireUser(["Admin"]);
  const result = await generateInvoicesForLeases(leaseIds, user.userId);
  revalidatePath("/admin/billing");
  revalidatePath("/admin/invoices");
  return result;
}

export async function manualGenerateInvoiceAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const leaseId = String(formData.get("lease_id"));
  const monthStr = String(formData.get("month"));
  
  if (!leaseId || !monthStr) throw new Error("Missing lease or month");
  const [year, month] = monthStr.split("-").map(Number);
  const targetDate = new Date(year, month - 1, 1);

  const result = await generateInvoicesForLeases([leaseId], user.userId, targetDate);
  revalidatePath("/admin/billing");
  revalidatePath("/admin/invoices");
  return result;
}

export async function markInvoicePaidAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const id = String(formData.get("invoice_id"));
  await markInvoicePaid(id, user.userId);
  revalidatePath("/admin/invoices");
}
