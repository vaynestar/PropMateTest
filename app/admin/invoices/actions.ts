"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateInvoicesForLeases, markInvoicePaid, getEligibleLeasesForInvoicing } from "@/lib/billing";
import prisma from "@/lib/prisma";

export async function getEligibleLeasesAction(targetDateStr?: string) {
  await requireUser(["Admin"]);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  return getEligibleLeasesForInvoicing(targetDate);
}

export async function getAllActiveLeasesAction() {
  await requireUser(["Admin"]);
  return prisma.tenantLease.findMany({
    where: { status: "Active" },
    include: { tenant: true, unit: true }
  });
}

export async function generateInvoicesAction(leaseIds: string[], targetDateStr?: string) {
  const user = await requireUser(["Admin"]);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const result = await generateInvoicesForLeases(leaseIds, user.userId, targetDate);
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

export async function addInvoiceDetailAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const invoice_id = String(formData.get("invoice_id"));
    let charge_id = String(formData.get("charge_id") || "");
    const description = String(formData.get("description"));
    const unit_price = Number(formData.get("unit_price"));
    const quantity = Number(formData.get("quantity") || "1");
    const uom = String(formData.get("uom") || "item");

    if (!invoice_id || !description.trim() || isNaN(unit_price) || unit_price <= 0) {
      return { error: "Please enter a valid description and positive unit price." };
    }

    if (!charge_id) {
      const defaultCharge = await prisma.chargeMaster.findFirst();
      if (!defaultCharge) {
        return { error: "No Master Charge template found in DB." };
      }
      charge_id = defaultCharge.charge_id;
    }

    const lineTotal = unit_price * quantity;

    await prisma.invoiceDetail.create({
      data: {
        invoice_id,
        charge_id,
        description: description.trim(),
        uom,
        unit_price,
        quantity,
        total_price: lineTotal,
        created_by: user.userId,
      }
    });

    // Recalculate invoice total amount
    const allDetails = await prisma.invoiceDetail.findMany({ where: { invoice_id } });
    const newTotal = allDetails.reduce((sum, d) => sum + Number(d.total_price), 0);

    await prisma.invoice.update({
      where: { invoice_id },
      data: { total_amount: newTotal, modified_by: user.userId }
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to add item to invoice." };
  }
}

export async function removeInvoiceDetailAction(formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const detail_id = String(formData.get("detail_id"));
    const invoice_id = String(formData.get("invoice_id"));

    if (!detail_id || !invoice_id) {
      return { error: "Invalid detail or invoice ID" };
    }

    await prisma.invoiceDetail.delete({
      where: { detail_id }
    });

    const allDetails = await prisma.invoiceDetail.findMany({ where: { invoice_id } });
    const newTotal = allDetails.reduce((sum, d) => sum + Number(d.total_price), 0);

    await prisma.invoice.update({
      where: { invoice_id },
      data: { total_amount: newTotal, modified_by: user.userId }
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove invoice item." };
  }
}
