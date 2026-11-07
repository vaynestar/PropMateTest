import Link from "next/link";
import UrgentActionList from "@/components/dashboard/UrgentActionList";
import { getDashboardStats } from "@/lib/dashboard";
import ScanButton from "@/components/visitors/ScanButton";
import FilterableTicketQueue from "@/components/dashboard/FilterableTicketQueue";
import FinancialTrendChart from "@/components/dashboard/FinancialTrendChart";
import { getActivePropertyId } from "@/lib/property-context.server";
import prisma from "@/lib/prisma";
import SetupFlow from "@/components/layout/SetupFlow";
import { getSetupProgress } from "@/lib/setup-progress";
import MaintenanceDueBoard from "@/components/dashboard/MaintenanceDueBoard";
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
  const [stats, setupCounts, activeProperty] = await Promise.all([
    getDashboardStats(propertyId),
    getSetupProgress(propertyId ?? null),
    propertyId
      ? prisma.propertyMaster.findUnique({
          where: { property_id: propertyId },
          select: { property_name: true },
        })
      : null,
  ]);
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="What needs your attention today."
        actions={
          <>
            <ScanButton />
            <Link href="/admin/reports" className={BTN.secondary}>
              <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
              Reports
            </Link>
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

      {/* Before the charts: on a phone this is the first thing after the numbers. */}
      <MaintenanceDueBoard items={stats.upcomingMaintenanceList} />

      {/*
        Four blocks were removed here (DEV-215), all of them restating
        something already on the page:
          · Unit mix donut   — the Occupancy tile is the same 50% / 6 of 12
          · Helpdesk load    — the Open tickets tile plus the ages already in
                               Work in progress
          · Recent activity  — ten rows of visitor check-ins nobody acts on
          · Quick actions    — the sidebar is the navigation
        Money first, then the work. Nothing is said twice.
      */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Billed vs collected">
            <FinancialTrendChart data={stats.financialTrend} />
          </SectionCard>
        </div>

        <SectionCard
          title="Visitor traffic"
          subtitle="Last 7 days"
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

      <SectionCard
        title="Money owed"
        subtitle="Oldest unpaid invoices first."
        action={
          <Link href="/admin/invoices" className="text-xs font-semibold text-primary hover:underline">
            All invoices
          </Link>
        }
        padded={false}
      >
        <ArrearsTable rows={stats.topArrears} />
      </SectionCard>

      <SectionCard
        title="Work in progress"
        action={
          <Link href="/admin/maintenance" className="text-xs font-semibold text-primary hover:underline">
            View all tickets
          </Link>
        }
      >
        <FilterableTicketQueue tickets={stats.openTicketsList} />
      </SectionCard>
    </div>
  );
}
