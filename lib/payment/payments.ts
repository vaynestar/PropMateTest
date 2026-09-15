import prisma from "@/lib/prisma";
import { createBill, getBillPayment, getToyyibPayConfig } from "./toyyibpay";

/**
 * Invoice payments (R3, Major Project).
 *
 * Two ways a resident pays, both recorded as a PaymentTransaction:
 *   - online, through ToyyibPay's hosted FPX checkout - confirmed automatically,
 *     but only after PropMate asks ToyyibPay directly (the callback is unsigned);
 *   - bank transfer, where the resident submits a reference and the management
 *     office confirms it by marking the invoice Paid.
 *
 * An invoice becomes Paid in exactly two places: confirmGatewayPayment() below,
 * and the admin's status change. Nothing a browser sends marks it Paid directly.
 */

export const GATEWAY_METHOD = "ToyyibPay FPX";
export const MANUAL_METHOD = "Bank transfer";

export function onlinePaymentsEnabled() {
  return getToyyibPayConfig() !== null;
}

export function onlinePaymentsAreSandbox() {
  return getToyyibPayConfig()?.isSandbox ?? false;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID.test(v);

/** Today as a @db.Date - the UTC midnight of the Malaysian calendar day. */
function todayAsDbDate() {
  const [y, m, d] = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** An issued invoice on the resident's own lease, or null. */
export async function findResidentInvoice(invoiceId: string, userId: string) {
  if (!isUuid(invoiceId)) return null;
  return prisma.invoice.findFirst({
    where: { invoice_id: invoiceId, issued_at: { not: null }, lease: { user_id: userId } },
    include: { lease: { include: { unit: true, tenant: true } } },
  });
}

export async function startGatewayPayment(input: {
  invoiceId: string;
  userId: string;
  baseUrl: string;
}): Promise<string> {
  const config = getToyyibPayConfig();
  if (!config) throw new Error("Online payment isn't set up yet. Please pay by bank transfer.");

  const invoice = await findResidentInvoice(input.invoiceId, input.userId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "Unpaid") throw new Error("This invoice isn't waiting for payment.");

  const bill = await createBill(config, {
    invoiceNo: invoice.invoice_no,
    description: `Unit ${invoice.lease.unit.unit_number} invoice ${invoice.invoice_no}`,
    amountRinggit: Number(invoice.total_amount),
    payerName: invoice.lease.tenant.user_name,
    payerEmail: invoice.lease.tenant.user_email,
    payerPhone: invoice.lease.tenant.phone_number ?? "",
    returnUrl: `${input.baseUrl}/api/payments/toyyibpay/return`,
    callbackUrl: `${input.baseUrl}/api/payments/toyyibpay/callback`,
  });

  // Recorded before the resident leaves, so a bill that is paid but whose
  // browser never comes back can still be matched when the callback arrives.
  await prisma.paymentTransaction.create({
    data: {
      invoice_id: invoice.invoice_id,
      transaction_type: "Payment",
      payment_date: todayAsDbDate(),
      transaction_amount: invoice.total_amount,
      payment_method: GATEWAY_METHOD,
      reference_number: bill.billCode,
      transaction_status: "Pending",
      created_by: input.userId,
    },
  });

  return bill.paymentUrl;
}

export type GatewayOutcome = "paid" | "pending" | "failed" | "mismatch" | "unknown";

/**
 * Settle a ToyyibPay bill. Safe to call any number of times and from anywhere
 * (return redirect, callback, a retry) - it only ever trusts ToyyibPay's own
 * answer, and does nothing further once a transaction is Success.
 */
export async function confirmGatewayPayment(
  billCode: string
): Promise<{ invoiceId: string | null; outcome: GatewayOutcome }> {
  const config = getToyyibPayConfig();
  const code = billCode.trim();
  if (!config || !code) return { invoiceId: null, outcome: "unknown" };

  const tx = await prisma.paymentTransaction.findFirst({
    where: { reference_number: code, payment_method: GATEWAY_METHOD },
  });
  if (!tx) return { invoiceId: null, outcome: "unknown" };
  if (tx.transaction_status === "Success") return { invoiceId: tx.invoice_id, outcome: "paid" };

  const result = await getBillPayment(config, code);

  if (result.paid) {
    const expectedCents = Math.round(Number(tx.transaction_amount) * 100);
    if (result.amountCents !== null && result.amountCents !== expectedCents) {
      // Paid, but not the amount billed. Never mark the invoice Paid on a
      // mismatch - leave it for the office to look at.
      await prisma.paymentTransaction.update({
        where: { transaction_id: tx.transaction_id },
        data: { transaction_status: "Amount mismatch" },
      });
      return { invoiceId: tx.invoice_id, outcome: "mismatch" };
    }

    await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { transaction_id: tx.transaction_id },
        data: { transaction_status: "Success", payment_date: todayAsDbDate() },
      }),
      // Only Unpaid -> Paid. A voided invoice that somehow gets paid is not
      // silently revived; the Success transaction is still on record.
      prisma.invoice.updateMany({
        where: { invoice_id: tx.invoice_id, status: "Unpaid" },
        data: { status: "Paid" },
      }),
    ]);
    return { invoiceId: tx.invoice_id, outcome: "paid" };
  }

  if (result.status === "failed") {
    await prisma.paymentTransaction.update({
      where: { transaction_id: tx.transaction_id },
      data: { transaction_status: "Failed" },
    });
    return { invoiceId: tx.invoice_id, outcome: "failed" };
  }

  return { invoiceId: tx.invoice_id, outcome: "pending" };
}

export async function submitManualPayment(input: {
  invoiceId: string;
  userId: string;
  reference: string;
}) {
  const invoice = await findResidentInvoice(input.invoiceId, input.userId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "Unpaid") throw new Error("This invoice isn't waiting for payment.");

  const reference = input.reference.trim();
  if (reference.length < 4 || reference.length > 60) {
    throw new Error("Enter the transfer reference from your bank (4 to 60 characters).");
  }

  const alreadyWaiting = await prisma.paymentTransaction.findFirst({
    where: { invoice_id: invoice.invoice_id, payment_method: MANUAL_METHOD, transaction_status: "Pending" },
  });
  if (alreadyWaiting) {
    throw new Error("You've already told us about a payment for this invoice. The office will confirm it.");
  }

  await prisma.paymentTransaction.create({
    data: {
      invoice_id: invoice.invoice_id,
      transaction_type: "Payment",
      payment_date: todayAsDbDate(),
      transaction_amount: invoice.total_amount,
      payment_method: MANUAL_METHOD,
      reference_number: reference,
      transaction_status: "Pending",
      created_by: input.userId,
    },
  });
}
