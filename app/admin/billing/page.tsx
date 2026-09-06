import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/lib/billing";
import StatusBadge from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

import GenerateInvoicesButton from "@/components/billing/GenerateInvoicesButton";
import BillingMonthlyBarChart from "@/components/billing/BillingMonthlyBarChart";
import RefreshDataButton from "@/components/billing/RefreshDataButton";
import { getActivePropertyId } from "@/lib/property-context.server";

export default async function BillingPage() {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? undefined;

  const invoices = await listInvoices(propertyId);

  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0
  );
  const outstanding = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const paidCount = invoices.filter((inv) => inv.status === "Paid").length;

  // Arrears. "Outstanding" alone says nothing about urgency — an invoice due
  // next week and one seven months late looked identical on this page.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unpaid = invoices.filter((inv) => inv.status !== "Paid");
  const overdue = unpaid
    .filter((inv) => new Date(inv.due_date) < today)
    .map((inv) => ({
      ...inv,
      daysLate: Math.floor(
        (today.getTime() - new Date(inv.due_date).getTime()) / 86_400_000
      ),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);
  const overdueAmount = overdue.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const collected = totalBilled - outstanding;
  const collectedPct = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0;

  function getMonthYear(date: Date | string) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  }

  const batches = invoices.reduce((acc, inv) => {
    const key = getMonthYear(inv.invoice_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {} as Record<string, typeof invoices>);

  const batchKeys = Object.keys(batches).sort((a, b) => {
    const dateA = new Date(batches[a][0].invoice_date).getTime();
    const dateB = new Date(batches[b][0].invoice_date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Billing
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Raise this month’s invoices and see what has been collected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshDataButton />
          <Link
            href="/admin/billing/recurring-charges"
            className="btn-outline px-5 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              autorenew
            </span>
            Recurring Charges
          </Link>
          <Link
            href="/admin/billing/charges"
            className="btn-outline px-5 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              settings
            </span>
            Charge types
          </Link>
          <GenerateInvoicesButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-stack-lg sm:grid-cols-3">
        {/* Outstanding leads, because it is the only figure that asks for an
            action. Overdue is called out inside it rather than buried. */}
        <div
          className={`rounded-xl border p-5 ${
            overdue.length > 0
              ? "border-rose-500/40 bg-rose-500/[0.06]"
              : "border-outline-variant/60 bg-surface-container"
          }`}
        >
          <p className="font-label-sm text-label-sm text-on-surface-variant">Outstanding</p>
          <p className="font-headline-md text-headline-md mt-1 text-rose-300">
            {formatCurrency(outstanding)}
          </p>
          <p className="mt-1.5 text-[11px]">
            {overdue.length > 0 ? (
              <span className="font-semibold text-rose-300">
                {formatCurrency(overdueAmount)} of it is overdue
                {overdue[0] ? ` — oldest by ${overdue[0].daysLate} days` : ""}
              </span>
            ) : unpaid.length > 0 ? (
              <span className="text-on-surface-variant">
                {unpaid.length} invoice{unpaid.length === 1 ? "" : "s"} not yet due
              </span>
            ) : (
              <span className="text-emerald-400">Everything is paid</span>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/60 bg-surface-container p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Collected</p>
          <p className="font-headline-md text-headline-md mt-1 text-emerald-300">
            {formatCurrency(collected)}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div className="h-full bg-emerald-500" style={{ width: `${collectedPct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-on-surface-variant">
            {collectedPct}% of {formatCurrency(totalBilled)} billed
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant/60 bg-surface-container p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">Invoices paid</p>
          <p className="font-headline-md text-headline-md mt-1 text-on-surface">
            {paidCount} <span className="text-on-surface-variant">of {invoices.length}</span>
          </p>
          <p className="mt-1.5 text-[11px] text-on-surface-variant">
            {invoices.length - paidCount} still open
          </p>
        </div>
      </div>

      {/* The page previously opened with a history chart — the least actionable
          thing on it. Who owes money, and for how long, comes first. */}
      {overdue.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-rose-500/30 bg-surface-container">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-6 py-4">
            <div>
              <h2 className="font-title-lg text-title-lg text-on-surface">Chasing payment</h2>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                {overdue.length} invoice{overdue.length === 1 ? "" : "s"} past the due date.
              </p>
            </div>
            <Link
              href="/admin/invoices"
              className="pressable rounded-lg border border-outline-variant/60 bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
            >
              Open invoices
            </Link>
          </div>

          <ul className="divide-y divide-outline-variant/20">
            {overdue.slice(0, 5).map((inv) => (
              <li
                key={inv.invoice_id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {inv.lease?.unit?.unit_number ?? "Unit"} — {inv.lease?.tenant?.user_name ?? "Tenant"}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {inv.invoice_no} · due {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                    {inv.daysLate} days late
                  </span>
                  <span className="text-xs font-bold text-white">
                    {formatCurrency(Number(inv.total_amount))}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {overdue.length > 5 && (
            <p className="border-t border-outline-variant/20 px-6 py-2.5 text-[11px] text-on-surface-variant">
              and {overdue.length - 5} more.
            </p>
          )}
        </section>
      )}

      {/* Client component. Pass only the three fields it reads — spreading the
          whole invoice dragged nested Decimals (details[], lease.unit) across
          the boundary and tripped Rule 6 again. */}
      <BillingMonthlyBarChart
        invoices={
          invoices.map((inv) => ({
            invoice_date: inv.invoice_date,
            status: inv.status,
            total_amount: Number(inv.total_amount),
          })) as any
        }
      />

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Monthly batches
          </h2>
          <Link
            href="/admin/invoices"
            className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high/50">
              <tr className="font-label-sm text-label-sm text-on-surface-variant">
                <th className="px-6 py-3">Batch Name</th>
                <th className="px-6 py-3 text-center">Invoices Generated</th>
                <th className="px-6 py-3 text-right">Collected (Paid)</th>
                <th className="px-6 py-3 text-right">Outstanding</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {batchKeys.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 font-body-md text-body-md text-on-surface-variant text-center"
                  >
                    No invoice batches yet. Click "Generate Monthly Invoices" to create
                    them from occupied units.
                  </td>
                </tr>
              )}
              {batchKeys.map((bk) => {
                const batchInvoices = batches[bk];
                const generated = batchInvoices.length;
                const collected = batchInvoices
                  .filter((i) => i.status === "Paid")
                  .reduce((sum, i) => sum + Number(i.total_amount), 0);
                const outst = batchInvoices
                  .filter((i) => i.status !== "Paid")
                  .reduce((sum, i) => sum + Number(i.total_amount), 0);
                return (
                  <tr
                    key={bk}
                    className="font-body-md text-body-md text-on-surface hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-label-md">
                      {bk}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-on-surface">
                        {generated}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                      {formatCurrency(collected)}
                    </td>
                    <td className="px-6 py-4 text-right text-rose-300 font-medium">
                      {formatCurrency(outst)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/admin/invoices"
                        className="font-label-sm text-label-sm text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
