import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/lib/billing";
import { BTN, EmptyState, Money, PageHeader, SectionCard, StatCard, StatGrid, TABLE } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Whole ringgit: this page is about scale, not cents. */
function formatCurrency(value: number) {
  return `RM ${Math.round(value).toLocaleString("en-MY")}`;
}

/** "16 Sep 2026" in Malaysia time - ICU prints "Sept" (DEV-184). */
function formatDate(date: Date | string) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(new Date(date))
    .split("-")
    .map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

import GenerateInvoicesButton from "@/components/billing/GenerateInvoicesButton";
import BillingMonthlyBarChart from "@/components/billing/BillingMonthlyBarChart";
import RefreshDataButton from "@/components/billing/RefreshDataButton";
import { getActivePropertyId } from "@/lib/property-context.server";
import SetupFlow from "@/components/layout/SetupFlow";
import { getSetupProgress } from "@/lib/setup-progress";
import prisma from "@/lib/prisma";

export default async function BillingPage() {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? undefined;

  const [invoices, setupCounts, activeProperty] = await Promise.all([
    listInvoices(propertyId),
    // The billing half of the setup chain was an open roadmap task ("Billing
    // Onboarding Setup Banner") and the same job as F5 - one banner, not two.
    getSetupProgress(propertyId),
    propertyId
      ? prisma.propertyMaster.findUnique({
          where: { property_id: propertyId },
          select: { property_name: true },
        })
      : null,
  ]);

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
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Billing"
        subtitle="Raise this month's invoices and see what has been collected."
        actions={
          <>
            <RefreshDataButton />
            <Link href="/admin/billing/recurring-charges" className={BTN.secondary}>
              <span className="material-symbols-outlined text-[18px] text-primary">autorenew</span>
              Recurring charges
            </Link>
            <Link href="/admin/billing/charges" className={BTN.secondary}>
              <span className="material-symbols-outlined text-[18px] text-primary">sell</span>
              Charge types
            </Link>
            <GenerateInvoicesButton />
          </>
        }
      />

      <SetupFlow counts={setupCounts} propertyName={activeProperty?.property_name ?? null} />

      <StatGrid cols={3}>
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          icon="account_balance_wallet"
          tone={overdue.length > 0 ? "critical" : "neutral"}
          href="/admin/invoices"
          footer={{
            label: overdue.length > 0 ? "Overdue" : unpaid.length > 0 ? "Not yet due" : "Status",
            value:
              overdue.length > 0
                ? `${formatCurrency(overdueAmount)} · oldest ${overdue[0].daysLate}d`
                : unpaid.length > 0
                ? `${unpaid.length} invoice${unpaid.length === 1 ? "" : "s"}`
                : "Everything is paid",
            tone: overdue.length > 0 ? "critical" : unpaid.length > 0 ? "neutral" : "positive",
          }}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(collected)}
          icon="payments"
          tone="positive"
          progress={collectedPct}
          footer={{ label: "Of billed", value: `${collectedPct}% of ${formatCurrency(totalBilled)}` }}
        />
        <StatCard
          label="Invoices paid"
          value={`${paidCount} of ${invoices.length}`}
          icon="receipt_long"
          tone={invoices.length - paidCount > 0 ? "warning" : "positive"}
          footer={{ label: "Still open", value: invoices.length - paidCount }}
        />
      </StatGrid>

      {/* Who owes money, and for how long, comes before any history chart. */}
      {overdue.length > 0 && (
        <SectionCard
          title="Chasing payment"
          subtitle={`${overdue.length} invoice${overdue.length === 1 ? "" : "s"} past the due date.`}
          icon="notification_important"
          action={
            <Link href="/admin/invoices" className={BTN.secondary}>
              Open invoices
            </Link>
          }
          padded={false}
        >
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead>
                <tr>
                  <th className={TABLE.th}>Unit</th>
                  <th className={TABLE.th}>Resident</th>
                  <th className={TABLE.th}>Invoice</th>
                  <th className={TABLE.th}>Due</th>
                  <th className={TABLE.thNum}>Late by</th>
                  <th className={TABLE.thNum}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {overdue.slice(0, 6).map((inv) => (
                  <tr key={inv.invoice_id} className={TABLE.tr}>
                    <td className={TABLE.td}>
                      {/* Each row leads to the tenancy it is chasing (DEV-164). */}
                      <Link
                        href={`/admin/invoices?lease=${inv.lease_id}`}
                        className="font-semibold text-white hover:text-primary hover:underline"
                      >
                        {inv.lease?.unit?.unit_number ?? "—"}
                      </Link>
                    </td>
                    <td className={TABLE.tdMuted}>
                      {inv.lease?.tenant ? (
                        <Link
                          href={`/admin/leases?tenant=${inv.lease.tenant.user_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {inv.lease.tenant.user_name}
                        </Link>
                      ) : (
                        "No tenant on the lease"
                      )}
                    </td>
                    <td className={TABLE.td + " font-mono text-xs text-on-surface-variant"}>{inv.invoice_no}</td>
                    <td className={TABLE.td + " whitespace-nowrap text-xs tabular-nums text-on-surface-variant"}>
                      {formatDate(inv.due_date)}
                    </td>
                    <td className={TABLE.tdNum}>
                      <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                        {inv.daysLate}d
                      </span>
                    </td>
                    <td className={TABLE.tdNum + " font-semibold"}>
                      <Money value={Number(inv.total_amount)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overdue.length > 6 && (
            <p className="border-t border-outline-variant/30 px-4 py-2.5 text-[11px] text-on-surface-variant">
              and {overdue.length - 6} more.
            </p>
          )}
        </SectionCard>
      )}

      <SectionCard
        title="Collected vs outstanding"
        subtitle="Each month's invoices, split by what has actually been paid."
        icon="bar_chart"
      >
        {/* Client component. Pass only the three fields it reads - spreading the
            whole invoice dragged nested Decimals across the boundary (Rule 6). */}
        <BillingMonthlyBarChart
          invoices={
            invoices.map((inv) => ({
              invoice_date: inv.invoice_date,
              status: inv.status,
              total_amount: Number(inv.total_amount),
            })) as any
          }
        />
      </SectionCard>

      <SectionCard
        title="Monthly batches"
        subtitle="Every run of invoices, newest first."
        icon="calendar_month"
        action={
          <Link href="/admin/invoices" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        }
        padded={false}
      >
        <div className={TABLE.wrap}>
          <table className={TABLE.table}>
            <thead>
              <tr>
                <th className={TABLE.th}>Batch</th>
                <th className={TABLE.thNum}>Invoices</th>
                <th className={TABLE.thNum}>Collected</th>
                <th className={TABLE.thNum}>Outstanding</th>
                <th className={TABLE.thNum}>Action</th>
              </tr>
            </thead>
            <tbody>
              {batchKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon="receipt_long"
                      title="No invoice batches yet"
                      hint="Use Generate monthly invoices to raise them from the active tenancies."
                    />
                  </td>
                </tr>
              )}
              {batchKeys.map((bk) => {
                const batchInvoices = batches[bk];
                const generated = batchInvoices.length;
                const batchCollected = batchInvoices
                  .filter((i) => i.status === "Paid")
                  .reduce((sum, i) => sum + Number(i.total_amount), 0);
                const outst = batchInvoices
                  .filter((i) => i.status !== "Paid")
                  .reduce((sum, i) => sum + Number(i.total_amount), 0);
                return (
                  <tr key={bk} className={TABLE.tr}>
                    <td className={TABLE.td + " font-semibold text-white"}>{bk}</td>
                    <td className={TABLE.tdNum}>{generated}</td>
                    <td className={TABLE.tdNum + " text-emerald-300"}>
                      <Money value={batchCollected} />
                    </td>
                    <td className={TABLE.tdNum + (outst > 0 ? " text-rose-300" : " text-on-surface-variant")}>
                      <Money value={outst} />
                    </td>
                    <td className={TABLE.tdNum}>
                      <Link href="/admin/invoices" className="text-xs font-semibold text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
