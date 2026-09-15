import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  MANUAL_METHOD,
  isUuid,
  onlinePaymentsAreSandbox,
  onlinePaymentsEnabled,
} from "@/lib/payment/payments";
import PaymentPanel from "./PaymentPanel";

export const dynamic = "force-dynamic";

const rm = (n: number) =>
  "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const day = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

const OUTCOME: Record<string, { tone: string; text: string }> = {
  paid: { tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", text: "Payment received. Thank you." },
  pending: {
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    text: "Your bank hasn't confirmed the payment yet. Check back in a few minutes.",
  },
  failed: { tone: "border-rose-500/30 bg-rose-500/10 text-rose-300", text: "The payment didn't go through. You haven't been charged — you can try again." },
  mismatch: {
    tone: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    text: "We received a payment that doesn't match this invoice. The management office will contact you.",
  },
  unknown: { tone: "border-outline-variant/50 bg-surface-container-high/40 text-on-surface-variant", text: "We couldn't find that payment." },
};

/**
 * One invoice, and how to pay it (R3). "Pay Now" and "History" on the home
 * screen both led to a list with nothing to tap: no line items, no PDF, no way
 * to pay. This is where they go now.
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
  const { payment } = await searchParams;
  if (!isUuid(id)) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { invoice_id: id, issued_at: { not: null }, lease: { user_id: user.userId } },
    include: {
      details: { orderBy: { created_at: "asc" } },
      lease: { include: { unit: { include: { property: true } } } },
    },
  });
  if (!invoice) notFound();

  const transactions = await prisma.paymentTransaction.findMany({
    where: { invoice_id: id },
    orderBy: { created_at: "desc" },
  });
  const pendingManual = transactions.find(
    (t) => t.payment_method === MANUAL_METHOD && t.transaction_status === "Pending"
  );

  const total = Number(invoice.total_amount);
  const isUnpaid = invoice.status === "Unpaid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = isUnpaid && new Date(invoice.due_date) < today;
  const outcome = payment ? OUTCOME[payment] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack-lg">
      <Link href="/resident/invoices" className="text-xs font-semibold text-primary hover:underline">
        ← All invoices
      </Link>

      {outcome && (
        <p role="status" className={`rounded-xl border p-3 text-sm ${outcome.tone}`}>
          {outcome.text}
        </p>
      )}

      <section className="glass-card flex flex-col gap-4 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-on-surface-variant">{invoice.invoice_no}</p>
            <h1 className="mt-1 text-2xl font-bold text-on-surface">{rm(total)}</h1>
            <p className="mt-1 text-xs text-on-surface-variant">
              Unit {invoice.lease.unit.unit_number} · {invoice.lease.unit.property.property_name}
            </p>
          </div>
          <StatusBadge status={overdue ? "Overdue" : invoice.status} variant="invoice" />
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

        <a
          href={`/print/invoice/${invoice.invoice_id}`}
          target="_blank"
          rel="noopener"
          className="pressable flex items-center justify-center gap-2 rounded-lg border border-outline py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download or print PDF
        </a>
      </section>

      {isUnpaid && (
        <section className="glass-card flex flex-col gap-3 rounded-xl p-5">
          <h2 className="text-base font-semibold text-on-surface">Pay this invoice</h2>
          <PaymentPanel
            invoiceId={invoice.invoice_id}
            amountLabel={rm(total)}
            onlineEnabled={onlinePaymentsEnabled()}
            sandbox={onlinePaymentsAreSandbox()}
            pendingManualReference={pendingManual?.reference_number ?? null}
          />
        </section>
      )}

      {transactions.length > 0 && (
        <section className="glass-card rounded-xl p-5">
          <h2 className="mb-2 text-sm font-semibold text-on-surface">Payment history</h2>
          <ul className="divide-y divide-outline-variant/25 text-xs">
            {transactions.map((t) => (
              <li key={t.transaction_id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 text-on-surface-variant">
                  {day(t.created_at)} · {t.payment_method}
                  {t.reference_number && <span className="block font-mono">{t.reference_number}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium text-on-surface">{rm(Number(t.transaction_amount))}</span>
                  <span className="text-on-surface-variant">{t.transaction_status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
