"use server";

import { revalidatePath } from "next/cache";
import { requireUser, verifyPassword } from "@/lib/auth";
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

export async function updateInvoiceStatusAction(invoiceId: string, newStatus: string) {
  const user = await requireUser(["Admin"]);
  if (!["Paid", "Unpaid", "Inactive"].includes(newStatus)) {
    return { error: "Invalid status option provided." };
  }

  const updated = await prisma.invoice.update({
    where: { invoice_id: invoiceId },
    data: {
      status: newStatus,
      modified_by: user.userId,
    },
    include: {
      modifier: { select: { user_name: true, user_email: true } }
    }
  });

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");

  const modifierName = updated.modifier?.user_name || user.user_email || "Admin";

  return {
    success: true,
    invoice_id: updated.invoice_id,
    invoice_no: updated.invoice_no,
    status: updated.status,
    modifier_name: modifierName,
    modified_at: updated.modified_at,
    message: `Invoice ${updated.invoice_no} status changed to ${updated.status} by ${modifierName}.`,
  };
}

export async function markInvoicePrintedAction(invoiceId: string) {
  const user = await requireUser(["Admin"]);
  const updated = await prisma.invoice.update({
    where: { invoice_id: invoiceId },
    data: {
      is_printed: true,
      modified_by: user.userId,
    },
    include: {
      modifier: { select: { user_name: true, user_email: true } }
    }
  });

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");

  return {
    success: true,
    invoice_id: updated.invoice_id,
    is_printed: true,
    modifier_name: updated.modifier?.user_name || "Admin",
    modified_at: updated.modified_at,
  };
}

export async function markInvoicePaidAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const id = String(formData.get("invoice_id"));
  await markInvoicePaid(id, user.userId);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");
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

    const targetInvoice = await prisma.invoice.findUnique({
      where: { invoice_id }
    });

    if (!targetInvoice) {
      return { error: "Invoice not found." };
    }

    if (targetInvoice.status === "Paid") {
      return { error: "Locked: Paid invoices cannot be edited." };
    }
    if (targetInvoice.issued_at) {
      return { error: "Locked: this invoice has been issued. Unlock it first." };
    }
    if (targetInvoice.status === "Inactive") {
      return { error: "Locked: Inactive invoices cannot be edited." };
    }

    if (!charge_id) {
      const defaultCharge = await prisma.chargeMaster.findFirst();
      if (!defaultCharge) {
        return { error: "No Master Charge template found in DB." };
      }
      charge_id = defaultCharge.charge_id;
    }

    const lineTotal = unit_price * quantity;

    const newDetail = await prisma.invoiceDetail.create({
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
    return { success: true, newDetail, newTotal };
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

    const targetInvoice = await prisma.invoice.findUnique({
      where: { invoice_id }
    });

    if (!targetInvoice) {
      return { error: "Invoice not found." };
    }

    if (targetInvoice.status === "Paid") {
      return { error: "Locked: Paid invoices cannot be edited." };
    }
    if (targetInvoice.issued_at) {
      return { error: "Locked: this invoice has been issued. Unlock it first." };
    }
    if (targetInvoice.status === "Inactive") {
      return { error: "Locked: Inactive invoices cannot be edited." };
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
    return { success: true, newTotal };
  } catch (error: any) {
    return { error: error.message || "Failed to remove invoice item." };
  }
}

/**
 * Issue an invoice to the tenant.
 *
 * This is the point of no return for editing. Before DEV-140 the lock fired on
 * `is_printed`, so merely opening the PDF preview froze the invoice for good —
 * a side effect rather than a decision, and nothing warned you. Issuing is now
 * deliberate: a draft can be edited freely, an issued invoice is a document of
 * record and only its payment status can change.
 */
export async function issueInvoiceAction(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const invoice_id = String(formData.get("invoice_id") || "");
    if (!invoice_id) throw new Error("Invoice ID is required.");

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_id },
      select: { issued_at: true, status: true, invoice_no: true },
    });
    if (!invoice) throw new Error("That invoice no longer exists.");
    if (invoice.issued_at) throw new Error("That invoice has already been issued.");
    if (invoice.status === "Inactive") {
      throw new Error("This invoice is voided. Restore it before issuing.");
    }

    await prisma.invoice.update({
      where: { invoice_id },
      data: { issued_at: new Date(), modified_by: user.userId },
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing");
    return { success: true, message: `${invoice.invoice_no} issued. Its items are now locked.` };
  } catch (error: any) {
    return { error: error.message || "Could not issue the invoice" };
  }
}


/** Plain-call variant, matching updateInvoiceStatusAction's shape. */
export async function issueInvoice(invoice_id: string) {
  const fd = new FormData();
  fd.set("invoice_id", invoice_id);
  return issueInvoiceAction(null, fd);
}


/**
 * Unlock an issued invoice for editing, behind the admin's own password.
 *
 * Issuing is meant to be final — that is the whole point of DEV-140. But an
 * invoice raised with the wrong figure is a real situation, and the only exits
 * without this were voiding it and reissuing under a new number, or editing the
 * row in the database. So the door exists, and re-entering the password is what
 * makes it a deliberate act rather than a stray click: the session is already
 * authenticated, so this proves the person at the keyboard is the account
 * holder, not someone who walked up to an unlocked screen.
 *
 * Paid and voided invoices stay shut. Those are settled states with their own
 * reversal (Unpay, Restore); unlocking is not the tool for them.
 */
export async function unlockInvoiceAction(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const invoice_id = String(formData.get("invoice_id") || "");
    const password = String(formData.get("password") || "");

    if (!invoice_id) throw new Error("Invoice ID is required.");
    if (!password) return { error: "Enter your password to unlock this invoice." };

    const account = await prisma.user.findUnique({
      where: { user_id: user.userId },
      select: { password_hash: true },
    });
    if (!account?.password_hash || !verifyPassword(password, account.password_hash)) {
      return { error: "That password is not correct." };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoice_id },
      select: { issued_at: true, status: true, invoice_no: true },
    });
    if (!invoice) throw new Error("That invoice no longer exists.");
    if (!invoice.issued_at) {
      return { error: "That invoice is already a draft." };
    }
    if (invoice.status === "Paid") {
      return { error: "This invoice is paid. Mark it unpaid first if it needs changing." };
    }
    if (invoice.status === "Inactive") {
      return { error: "This invoice is voided. Restore it first." };
    }

    await prisma.invoice.update({
      where: { invoice_id },
      data: { issued_at: null, modified_by: user.userId },
    });

    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing");
    return {
      success: true,
      message: `${invoice.invoice_no} is a draft again. Reissue it once the items are right.`,
    };
  } catch (error: any) {
    return { error: error.message || "Could not unlock the invoice" };
  }
}
