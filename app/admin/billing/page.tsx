import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/lib/billing";
import { BTN, EmptyState, Money, PageHeader, SectionCard, StatCard, StatGrid, TABLE } from "@/components/admin/ui";
import GenerateInvoicesButton from "@/components/billing/GenerateInvoicesButton";
import RefreshButton from "@/components/admin/RefreshButton";
import BillingMonthlyBarChart from "@/components/billing/BillingMonthlyBarChart";
import { getActivePropertyId } from "@/lib/property-context.server";
import { getSetupProgress } from "@/lib/setup-progress";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Whole ringgit: this page is about scale, not cents. */
function formatCurrency(value: number) {
  return `RM ${Math.round(value).toLocaleString("en-MY")}`;
}

/**
 * Billing overview, rebuilt to the batch-1 `BillingOverview` artboard
 * (DEV-258).
 *
 * The page had five stacked sections — tiles, a Chasing payment table, a
 * chart, and a batches table — three of which answered the same question in
 * three different shapes. Two things came out of it and one came in:
 *
 *   · the Chasing payment table is gone. DEV-254 gave arrears a whole screen
 *     that groups by household and records what has been sent; a six-row
 *     read-only copy on the overview was the weaker half of the same job.
 *     The Outstanding tile links there.
 *   · the chart and the batches table are now one card. They were two cards
 *     describing the same six months, so the reader had to match a bar to a
 *     row across a gap.
 *   · bank-in slips waiting to be checked now have a panel. They are the one
 *     thing on this page with a clock on it — a resident has said they paid
 *     and is waiting to be believed — and nothing surfaced them here at all.
 */
export default async function BillingPage() {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? undefined;

  const [invoices, setupCounts, activeProperty] = await Promise.all([
    listInvoices(propertyId),
    getSetupProgress(propertyId),
    propertyId
      ? prisma.propertyMaster.findUnique({
          where: { property_id: propertyId },
          select: { property_name: true },
        })
      : null,
  ]);

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const live = invoices.filter((inv) => inv.status !== "Inactive");
  const unpaid = live.filter((inv) => inv.status !== "Paid");
  const outstanding = unpaid.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const paidCount = live.filter((inv) => inv.status === "Paid").length;
  const collected = totalBilled - outstanding;
  const collectedPct = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = unpaid
    .filter((inv) => new Date(inv.due_date) < today)
    .map((inv) => ({
      ...inv,
      daysLate: Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);
  const overdueAmount = overdue.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  /*
   * Slips waiting. `listInvoices` already pulls the pending bank-transfer
   * transaction on each invoice (R3) — the invoice list uses it for the
   * "Slip to check" chip — but the overview never read it, so the one item
   * on this page with somebody waiting at the other end was invisible.
   */
  const withSlips = live.filter((inv) => inv.transactions?.[0]);
  const slipTotal = withSlips.reduce(
    (sum, inv) => sum + Number(inv.transactions[0].transaction_amount ?? 0),
    0
  );
  const oldestSlip = withSlips.reduce<Date | null>((oldest, inv) => {
    const at = new Date(inv.transactions[0].created_at);
    return !oldest || at < oldest ? at : oldest;
  }, null);
  const slipAgeDays = oldestSlip
    ? Math.floor((Date.now() - oldestSlip.getTime()) / 86_400_000)
    : 0;

  /*
   * Where the money comes from. Every invoice line carries its charge, so the
   * mix is already in the data; nothing on the admin side had ever added it
   * up. It answers the question a committee asks at an AGM — how much of the
   * bill is the sinking fund — which no screen could answer before.
   */
  const byCharge = new Map<string, number>();
  for (const inv of live) {
    for (const d of inv.details ?? []) {
      const name = d.charge?.charge_name ?? "Other";
      byCharge.set(name, (byCharge.get(name) ?? 0) + Number(d.total_price ?? 0));
    }
  }
  const chargeMix = [...byCharge.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const chargeTop = chargeMix[0]?.amount ?? 0;

  /*
   * The setup chain as a rail rather than a banner. SetupFlow still guides a
   * brand-new property from /admin and /admin/leases; on Billing the same six
   * steps are more useful as a standing list with their counts, because the
   * question here is not "what do I do first" but "is this property actually
   * set up to be billed". A step at zero keeps its link.
   */
  const chain = [
    { label: "Property created", n: setupCounts.properties, href: "/admin/properties" },
    { label: "Units added", n: setupCounts.units, href: "/admin/units" },
    { label: "Residents registered", n: setupCounts.tenants, href: "/admin/tenants" },
    { label: "Leases active", n: setupCounts.leases, href: "/admin/leases" },
    { label: "Recurring charges set", n: setupCounts.leases - setupCounts.unbillableLeases, href: "/admin/billing/recurring-charges" },
    { label: "Invoices raised", n: setupCounts.invoices, href: "/admin/invoices" },
  ];

  function getMonthYear(date: Date | string) {
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(date));
  }

  const batches = live.reduce((acc, inv) => {
    const key = getMonthYear(inv.invoice_date);
    (acc[key] ??= []).push(inv);
    return acc;
  }, {} as Record<string, typeof live>);

  const batchKeys = Object.keys(batches).sort(
    (a, b) =>
      new Date(batches[b][0].invoice_date).getTime() - new Date(batches[a][0].invoice_date).getTime()
  );

  const thisMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Billing"
        subtitle={`${activeProperty?.property_name ?? "This property"} · ${thisMonth}`}
        actions={
          <>
            {/* "Recurring charges" moved out of the header and onto its own
                step in the chain, which is where somebody looks for it. */}
            <Link href="/admin/billing/charges" className={BTN.secondary}>
              Charge types
            </Link>
            <Link href="/admin/invoices" className={BTN.secondary}>
              All invoices
            </Link>
            <RefreshButton title="Re-read the billing figures from the server" />
            <GenerateInvoicesButton />
          </>
        }
      />

      <StatGrid cols={3}>
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          icon="account_balance_wallet"
          tone={overdue.length > 0 ? "critical" : "neutral"}
          href={overdue.length > 0 ? "/admin/billing/arrears" : "/admin/invoices"}
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
          href="/admin/invoices?status=Paid"
          footer={{ label: "Of billed", value: `${collectedPct}% of ${formatCurrency(totalBilled)}` }}
        />
        <StatCard
          label="Invoices settled"
          value={`${paidCount} of ${live.length}`}
          icon="receipt_long"
          tone={live.length - paidCount > 0 ? "warning" : "positive"}
          href="/admin/invoices"
          footer={{ label: "Still open", value: live.length - paidCount }}
        />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* The chart and the runs that produced it, in one card. */}
        <div className="min-w-0 lg:col-span-2">
          <SectionCard
            title="Billed against collected"
            subtitle="Each month's invoices, split by what has actually been paid."
            padded={false}
            action={
              <span className="flex gap-3 text-[11px] text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                  Collected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#3b4560]" />
                  Still owed
                </span>
              </span>
            }
          >
            <div className="px-4 pb-2 pt-4">
              {/* Client component. Pass only the three fields it reads —
                  spreading the whole invoice dragged nested Decimals across
                  the boundary (Rule 6). */}
              <BillingMonthlyBarChart
                invoices={
                  live.map((inv) => ({
                    invoice_date: inv.invoice_date,
                    status: inv.status,
                    total_amount: Number(inv.total_amount),
                  })) as any
                }
              />
            </div>

            <div className={TABLE.wrap + " border-t border-outline-variant/40"}>
              <table className={TABLE.table}>
                <caption className="sr-only">Monthly invoice runs</caption>
                <thead>
                  <tr>
                    <th className={TABLE.th}>Run</th>
                    <th className={TABLE.thNum}>Invoices</th>
                    <th className={TABLE.thNum}>Collected</th>
                    <th className={TABLE.thNum}>Still owed</th>
                    <th className={TABLE.thNum}>
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batchKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <EmptyState
                          icon="receipt_long"
                          title="Nothing has been billed for this property"
                          hint="Raise the first run from the active tenancies, or write a one-off invoice."
                        />
                      </td>
                    </tr>
                  )}
                  {batchKeys.map((bk) => {
                    const rows = batches[bk];
                    const batchCollected = rows
                      .filter((i) => i.status === "Paid")
                      .reduce((sum, i) => sum + Number(i.total_amount), 0);
                    const owed = rows
                      .filter((i) => i.status !== "Paid")
                      .reduce((sum, i) => sum + Number(i.total_amount), 0);
                    return (
                      <tr key={bk} className={TABLE.tr}>
                        <td className={TABLE.td + " font-semibold text-white"}>{bk}</td>
                        <td className={TABLE.tdNum}>{rows.length}</td>
                        <td className={TABLE.tdNum + " text-emerald-300"}>
                          <Money value={batchCollected} />
                        </td>
                        <td className={TABLE.tdNum + (owed > 0 ? " font-semibold text-rose-300" : " text-on-surface-variant")}>
                          <Money value={owed} />
                        </td>
                        <td className={TABLE.tdNum}>
                          <Link
                            href="/admin/invoices"
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Open
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

        <div className="min-w-0 space-y-5">
          {/* Somebody is waiting at the other end of this one. */}
          {withSlips.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4">
              <h2 className="text-[15px] font-bold text-amber-200">
                {withSlips.length} slip{withSlips.length === 1 ? "" : "s"} waiting
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {formatCurrency(slipTotal)} in total. The oldest came in{" "}
                {slipAgeDays === 0 ? "today" : slipAgeDays === 1 ? "yesterday" : `${slipAgeDays} days ago`}.
              </p>
              <Link
                href="/admin/invoices"
                className="pressable mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-amber-400 text-sm font-bold text-[#241a02] transition-colors hover:bg-amber-300"
              >
                Check them now
              </Link>
            </div>
          )}

          <SectionCard
            title="How a property gets billed"
            subtitle="Every step done for this property."
            padded={false}
          >
            <ol className="divide-y divide-outline-variant/30">
              {chain.map((step) => {
                const done = step.n > 0;
                return (
                  <li key={step.label}>
                    <Link
                      href={step.href}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-high/50"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                          done
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : "border-outline-variant bg-surface-container-high text-on-surface-variant/40"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px] leading-none">
                          {done ? "check" : "remove"}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-on-surface">{step.label}</span>
                      <span
                        className={`text-xs tabular-nums ${
                          done ? "text-on-surface-variant" : "font-semibold text-amber-300"
                        }`}
                      >
                        {step.n}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </SectionCard>

          {chargeMix.length > 0 && (
            <SectionCard title="Where the money comes from" subtitle="Every invoice line, by charge.">
              <div className="space-y-3">
                {chargeMix.map((c) => (
                  <div key={c.name}>
                    <div className="mb-1.5 flex justify-between gap-2 text-xs">
                      <span className="truncate text-on-surface">{c.name}</span>
                      <span className="shrink-0 tabular-nums text-on-surface-variant">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          /* A 3% floor. Monthly rental is RM 34,000 against a
                             RM 100 parking fee, so an honest 0.3% bar is a
                             bar nobody can see — the stub says "small", which
                             is the only thing it needs to say. */
                          width: `${Math.max(3, chargeTop > 0 ? (c.amount / chargeTop) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
