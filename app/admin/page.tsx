import Link from "next/link";
import UrgentActionList from "@/components/dashboard/UrgentActionList";
import { getDashboardStats } from "@/lib/dashboard";
import ScanButton from "@/components/visitors/ScanButton";
import RepairsWaiting from "@/components/dashboard/RepairsWaiting";
import FinancialTrendChart from "@/components/dashboard/FinancialTrendChart";
import { getActivePropertyId } from "@/lib/property-context.server";
import prisma from "@/lib/prisma";
import SetupFlow from "@/components/layout/SetupFlow";
import { getSetupProgress } from "@/lib/setup-progress";
import { getNavCounts } from "@/lib/nav-counts";
import ArrearsTable from "@/components/dashboard/ArrearsTable";
import { VisitorTrendChart } from "@/components/dashboard/MiniCharts";
import { BTN, Money, PageHeader, SectionCard, StatCard, StatGrid } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/** The admin home: what needs attention, the numbers, and the work in flight. */
export default async function AdminDashboardPage() {
  const propertyId = (await getActivePropertyId()) ?? undefined;
  // The setup chain belongs here above all: /admin is where every session
  // starts, and a new admin should not have to find Leases or Billing to
  // learn that a lease is what joins a unit to a tenant. Collapsed to one
  // strip once the property is billing (see components/layout/SetupFlow).
  const [stats, setupCounts, activeProperty, counts] = await Promise.all([
    getDashboardStats(propertyId),
    getSetupProgress(propertyId ?? null),
    propertyId
      ? prisma.propertyMaster.findUnique({
          where: { property_id: propertyId },
          select: { property_name: true },
        })
      : null,
    // Reused from the sidebar (DEV-270) rather than counted twice.
    getNavCounts(propertyId ?? null),
  ]);

  /*
   * The four things an admin opens the laptop to do (DEV-271). Not a tile
   * grid — the sidebar is the navigation, and DEV-215 removed a "Quick
   * actions" grid for exactly that reason. These are verbs, in the header,
   * where a page's actions already live on every other screen.
   */
  const quickActions = [
    { label: "Raise invoices", href: "/admin/billing", dot: "bg-primary" },
    { label: "Log a repair", href: "/admin/maintenance", dot: "bg-amber-400" },
    { label: "Register a visitor", href: "/admin/visitors", dot: "bg-emerald-400" },
    { label: "Post a notice", href: "/admin/announcements", dot: "bg-sky-400" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="What needs your attention today."
        actions={
          <>
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="pressable inline-flex h-10 items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
              >
                <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${a.dot}`} />
                {a.label}
              </Link>
            ))}
            <ScanButton />
          </>
        }
      />

      <SetupFlow counts={setupCounts} propertyName={activeProperty?.property_name ?? null} />

      {stats.urgentActionItems.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-rose-500/40 bg-rose-500/[0.06]">
          <div className="flex items-center gap-2 border-b border-rose-500/25 px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-rose-400">warning</span>
            <h2 className="text-sm font-bold text-white">
              Needs attention{" "}
              <span className="ml-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-rose-200">
                {stats.urgentActionItems.length}
              </span>
            </h2>
          </div>
          <div className="p-4">
            <UrgentActionList items={stats.urgentActionItems as any} />
          </div>
        </section>
      )}

      <StatGrid>
        <StatCard
          label="Occupancy"
          value={`${stats.occupancyRate}%`}
          hint={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
          icon="home_work"
          tone="primary"
          href="/admin/units"
          progress={stats.occupancyRate}
        />
        <StatCard
          label="Collected today"
          value={<Money value={stats.todayCollectedAmount} />}
          icon="payments"
          tone="positive"
          href="/admin/invoices"
          footer={{
            label: "Outstanding",
            value: <Money value={stats.outstandingAmount} />,
            tone: stats.outstandingAmount > 0 ? "critical" : "neutral",
          }}
        />
        <StatCard
          label="Visitors on site"
          value={stats.activeVisitorsCount}
          hint="right now"
          icon="badge"
          tone="positive"
          href="/admin/visitors"
          footer={{ label: "Guardhouse", value: "Open", tone: "positive" }}
        />
        <StatCard
          label="Open tickets"
          value={stats.openTickets}
          hint="unresolved"
          icon="build"
          tone={stats.urgentTicketsCount > 0 ? "warning" : "neutral"}
          href="/admin/maintenance"
          footer={{
            label: "Urgent or high",
            value: stats.urgentTicketsCount,
            tone: stats.urgentTicketsCount > 0 ? "warning" : "neutral",
          }}
        />
      </StatGrid>

      {/*
        Above the fold, side by side: the money graph and the repairs. Both
        were asked for by name (user, on the dashboard redesign: this page is
        access and overview, not a worklist — the chart and the maintenance
        queue stay above the fold). The queue used to be the LAST thing on
        the page, under two charts and a table.

        Four blocks were removed in DEV-215 and stay removed, all of them
        restating something already here: the unit-mix donut (the Occupancy
        tile is the same figure), the helpdesk-load bar (the Open tickets
        tile), recent activity (ten rows nobody acts on), and a quick-actions
        grid (the sidebar is the navigation — the verbs are in the header).

        Facility servicing also left this page in DEV-271: DEV-267 gave it a
        proper schedule on Facilities with its own overdue strip, and a
        second copy here was the weaker half.
      */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionCard title="Billed against collected" subtitle="Six months of invoices, against what was paid.">
            <FinancialTrendChart data={stats.financialTrend} />
          </SectionCard>
        </div>

        <div className="min-w-0">
          <RepairsWaiting
            tickets={stats.openTicketsList}
            unowned={counts.unownedTickets}
            total={stats.openTickets}
          />
        </div>
      </div>

      {/* Below the fold: reference, not the glance. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <SectionCard
            title="Money owed"
            subtitle="Longest overdue first."
            action={
              <Link
                href="/admin/billing/arrears"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Chase them
              </Link>
            }
            padded={false}
          >
            <ArrearsTable rows={stats.topArrears} />
          </SectionCard>
        </div>

        <div className="min-w-0">
          <SectionCard
            title="Visitors through the gate"
            subtitle="Last seven days"
            action={
              <span className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#8b5cf6]" />
                  Expected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#34d399]" />
                  Arrived
                </span>
              </span>
            }
          >
            <VisitorTrendChart data={stats.visitorTrend} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
