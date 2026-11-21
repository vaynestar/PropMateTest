import prisma from "@/lib/prisma";
import {
  MANUAL_METHOD,
  SUBMISSION_FIELDS,
  isUuid,
  onlinePaymentsEnabled,
  todayMY,
} from "@/lib/payment/payments";
import { getPaymentInstructions } from "@/lib/settings";
import { invoiceState, isSettled } from "@/lib/invoice-state";
import { rm } from "@/lib/money";
import type { BankDetails, Submission } from "@/app/resident/invoices/[id]/PaymentPanel";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "16 Sep 2026" in Malaysia time (Intl prints "Sept"). */
const day = (d: Date | string) => {
  const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(new Date(d))
    .split("-")
    .map(Number);
  return `${dd} ${MONTHS[m - 1]} ${y}`;
};

export type InvoiceDetail = {
  invoiceId: string;
  invoiceNo: string;
  status: string;
  amountLabel: string;
  unitLabel: string;
  issued: string;
  due: string;
  isUnpaid: boolean;
  checking: boolean;
  overdue: boolean;
  lines: { id: string; description: string; qty: number; unitPrice: string; total: string }[];
  totalLabel: string;
  history: { id: string; on: string; method: string; reference: string | null; amount: string; status: string; reviewNote: string | null }[];
  bank: BankDetails;
  submission: Submission | null;
  today: string;
  onlineEnabled: boolean;
};

/**
 * One resident's invoice, flattened into plain values.
 *
 * Shared by the page at /resident/invoices/[id] and by the dialog the list
 * opens (DEV-242). Both must show exactly the same bill, so the shaping lives
 * here once rather than being written twice and drifting - Decimals converted,
 * dates formatted in Malaysia time, state resolved through lib/invoice-state.
 *
 * Returns null when the invoice is not this user's, is not issued, or does
 * not exist. The caller decides whether that is a 404 or a message in a
 * dialog; it must never be the difference between "no" and "not yours".
 */
export async function getResidentInvoiceDetail(
  invoiceId: string,
  userId: string
): Promise<InvoiceDetail | null> {
  if (!isUuid(invoiceId)) return null;

  const invoice = await prisma.invoice.findFirst({
    where: { invoice_id: invoiceId, issued_at: { not: null }, lease: { user_id: userId } },
    include: {
      details: { orderBy: { created_at: "asc" } },
      lease: { include: { unit: { include: { property: true } } } },
    },
  });
  if (!invoice) return null;

  const [transactions, bank] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: { invoice_id: invoiceId },
      orderBy: { created_at: "desc" },
      select: SUBMISSION_FIELDS,
    }),
    getPaymentInstructions(),
  ]);

  const latestManual = transactions.find((t) => t.payment_method === MANUAL_METHOD) ?? null;
  const submission: Submission | null = latestManual
    ? {
        transactionId: latestManual.transaction_id,
        status: latestManual.transaction_status,
        reference: latestManual.reference_number,
        paidOn: day(latestManual.payment_date),
        submittedOn: day(latestManual.created_at),
        reviewNote: latestManual.review_note,
        hasProof: !!latestManual.proof_mime,
      }
    : null;

  const total = Number(invoice.total_amount);
  const checking = submission?.status === "Pending";

  return {
    invoiceId: invoice.invoice_id,
    invoiceNo: invoice.invoice_no,
    status: invoice.status,
    amountLabel: rm(total),
    unitLabel: `Unit ${invoice.lease.unit.unit_number} · ${invoice.lease.unit.property.property_name}`,
    issued: day(invoice.invoice_date),
    due: day(invoice.due_date),
    /*
     * "Can this still be paid?", not "is the status exactly Unpaid?".
     *
     * Two invoices in the database are stored with status "Overdue" - seed
     * data, from before the admin actions were narrowed to Paid/Unpaid/
     * Inactive. The list derives its state from invoiceState() and so offered
     * "Pay this" on them, while this line said they were not unpaid and the
     * payment panel never rendered: the resident tapped Pay and arrived at a
     * bill with no way to pay it. Both belong to UAT residents (res3, res5).
     */
    isUnpaid: !isSettled(invoice.status),
    checking,
    /*
     * This read the server's midnight and ignored the payment under review,
     * so an invoice showed Overdue here and "Being checked" in the list it
     * was opened from (R17). Both ask lib/invoice-state.
     */
    overdue: invoiceState(invoice, checking) === "overdue",
    lines: invoice.details.map((d) => ({
      id: d.detail_id,
      description: d.description,
      qty: Number(d.quantity),
      unitPrice: rm(Number(d.unit_price)),
      total: rm(Number(d.total_price)),
    })),
    totalLabel: rm(total),
    history: transactions.map((t) => ({
      id: t.transaction_id,
      on: day(t.created_at),
      method: t.payment_method,
      reference: t.reference_number,
      amount: rm(Number(t.transaction_amount)),
      status: t.transaction_status,
      reviewNote: t.review_note,
    })),
    bank,
    submission,
    today: todayMY(),
    onlineEnabled: onlinePaymentsEnabled(),
  };
}
