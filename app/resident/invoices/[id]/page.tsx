import Link from "next/link";
import { ViewerButton } from "@/components/ui/MediaViewer";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getPaymentInstructions } from "@/lib/settings";
import {
  MANUAL_METHOD,
  SUBMISSION_FIELDS,
  isUuid,
  onlinePaymentsEnabled,
  todayMY,
} from "@/lib/payment/payments";
import PaymentPanel, { type Submission } from "./PaymentPanel";

export const dynamic = "force-dynamic";

const rm = (n: number) =>
  "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "16 Sep 2026" in Malaysia time (Intl prints "Sept"). */
const day = (d: Date | string) => {
  const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(d)).split("-").map(Number);
  return `${dd} ${MONTHS[m - 1]} ${y}`;
};

const STATUS_LABEL: Record<string, string> = {
  Pending: "Being checked",
  Success: "Confirmed",
  Rejected: "Not accepted",
  Failed: "Failed",
  "Amount mismatch": "Amount mismatch",
};

/**
 * One invoice, and how to pay it. Payment is by bank transfer with proof,
 * verified by the office before the invoice turns Paid (user, 2026-09-15).
 */
export default async function ResidentInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireUser(["Resident"]);
  const { id } = await params;
  await searchParams;
  if (!isUuid(id)) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { invoice_id: id, issued_at: { not: null }, lease: { user_id: user.userId } },
    include: {
      details: { orderBy: { created_at: "asc" } },
      lease: { include: { unit: { include: { property: true } } } },
    },
  });
  if (!invoice) notFound();

  const [transactions, bank] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: { invoice_id: id },
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
  const isUnpaid = invoice.status === "Unpaid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = isUnpaid && new Date(invoice.due_date) < today;
  const checking = submission?.status === "Pending";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack-lg">
      <Link href="/resident/invoices" className="text-xs font-semibold text-primary hover:underline">
        ← All invoices
      </Link>

      <section className="glass-card flex flex-col gap-4 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-on-surface-variant">{invoice.invoice_no}</p>
            <h2 className="mt-1 text-2xl font-bold text-on-surface">{rm(total)}</h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Unit {invoice.lease.unit.unit_number} · {invoice.lease.unit.property.property_name}
            </p>
          </div>
          {checking ? (
            <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              Being checked
            </span>
          ) : (
            <StatusBadge status={overdue ? "Overdue" : invoice.status} variant="invoice" />
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-outline-variant/30 pt-3 text-xs">
          <div>
            <dt className="text-on-surface-variant">Issued</dt>
            <dd className="font-medium text-on-surface">{day(invoice.invoice_date)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Due</dt>
            <dd className={`font-medium ${overdue ? "text-rose-300" : "text-on-surface"}`}>{day(invoice.due_date)}</dd>
          </div>
        </dl>

        <ul className="divide-y divide-outline-variant/25 border-t border-outline-variant/30">
          {invoice.details.map((d) => (
            <li key={d.detail_id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 text-on-surface">
                {d.description}
                {Number(d.quantity) !== 1 && (
                  <span className="block text-[11px] text-on-surface-variant">
                    {Number(d.quantity)} × {rm(Number(d.unit_price))}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium text-on-surface">{rm(Number(d.total_price))}</span>
            </li>
          ))}
          <li className="flex justify-between py-2.5 text-sm font-bold text-on-surface">
            <span>Total</span>
            <span>{rm(total)}</span>
          </li>
        </ul>

        <ViewerButton
          items={[{ src: `/print/invoice/${invoice.invoice_id}`, title: `Invoice ${invoice.invoice_no}`, kind: "doc" }]}
          className="pressable w-full flex items-center justify-center gap-2 rounded-lg border border-outline py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[18px]">description</span>
          View or print invoice
        </ViewerButton>
      </section>

      {isUnpaid && (
        <section className="glass-card flex flex-col gap-3 rounded-xl p-5">
          <h2 className="text-base font-semibold text-on-surface">Pay this invoice</h2>
          <PaymentPanel
            invoiceId={invoice.invoice_id}
            amountLabel={rm(total)}
            bank={bank}
            submission={submission}
            today={todayMY()}
            onlineEnabled={onlinePaymentsEnabled()}
          />
        </section>
      )}

      {transactions.length > 0 && (
        <section className="glass-card rounded-xl p-5">
          <h2 className="mb-2 text-sm font-semibold text-on-surface">Payment history</h2>
          <ul className="divide-y divide-outline-variant/25 text-xs">
            {transactions.map((t) => (
              <li key={t.transaction_id} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0 text-on-surface-variant">
                  {day(t.created_at)} · {t.payment_method}
                  {t.reference_number && <span className="block font-mono">{t.reference_number}</span>}
                  {t.transaction_status === "Rejected" && t.review_note && (
                    <span className="block text-rose-300">{t.review_note}</span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium text-on-surface">{rm(Number(t.transaction_amount))}</span>
                  <span className="text-on-surface-variant">{STATUS_LABEL[t.transaction_status] ?? t.transaction_status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
