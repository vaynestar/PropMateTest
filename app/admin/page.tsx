import Link from "next/link";
import UrgentActionList from "@/components/dashboard/UrgentActionList";
import { getDashboardStats } from "@/lib/dashboard";
import ScanButton from "@/components/visitors/ScanButton";
import FilterableTicketQueue from "@/components/dashboard/FilterableTicketQueue";
import FinancialTrendChart from "@/components/dashboard/FinancialTrendChart";
import { getActivePropertyId } from "@/lib/property-context.server";
import { BTN, EmptyState, Money, PageHeader, SectionCard, StatCard, StatGrid } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const ACTIVITY = {
  VISITOR: { icon: "badge", tint: "text-purple-300 bg-purple-500/15" },
  TICKET: { icon: "build", tint: "text-amber-300 bg-amber-500/15" },
  PAYMENT: { icon: "payments", tint: "text-emerald-300 bg-emerald-500/15" },
  DEFAULT: { icon: "campaign", tint: "text-primary bg-primary/15" },
} as const;

const QUICK_ACTIONS = [
  { href: "/admin/maintenance", icon: "add_task", label: "Raise a ticket" },
  { href: "/admin/invoices", icon: "receipt_long", label: "Issue an invoice" },
  { href: "/admin/announcements", icon: "campaign", label: "Post a notice" },
  { href: "/admin/bookings", icon: "calendar_month", label: "Facility schedule" },
];

/** The admin home: what needs attention, the numbers, and the work in flight. */
export default async function AdminDashboardPage() {
  const propertyId = (await getActivePropertyId()) ?? undefined;
  const stats = await getDashboardStats(propertyId);
  const time = (d: Date | string) =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(d));

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard
            title="Billed vs collected"
            subtitle="What you invoiced against what was actually paid."
            icon="show_chart"
          >
            <FinancialTrendChart data={stats.financialTrend} />
          </SectionCard>

          <SectionCard
            title="Work in progress"
            subtitle="Tickets that are open or being worked on."
            icon="engineering"
            action={
              <Link href="/admin/maintenance" className="text-xs font-semibold text-primary hover:underline">
                View all tickets
              </Link>
            }
          >
            <FilterableTicketQueue tickets={stats.openTicketsList} />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Recent activity" subtitle="What happened today" icon="bolt" padded={false}>
            {stats.activityFeed.length > 0 ? (
              <ul className="max-h-[22rem] divide-y divide-outline-variant/30 overflow-y-auto">
                {stats.activityFeed.map((event) => {
                  const kind = ACTIVITY[event.type as keyof typeof ACTIVITY] ?? ACTIVITY.DEFAULT;
                  return (
                    <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${kind.tint}`}>
                        <span className="material-symbols-outlined text-[16px]">{kind.icon}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-white">{event.title}</span>
                          <span className="shrink-0 text-[11px] tabular-nums text-on-surface-variant">
                            {time(event.timestamp)}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-on-surface-variant">{event.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon="notifications_off" title="Nothing has happened today yet." />
            )}
          </SectionCard>

          {stats.upcomingMaintenanceList.length > 0 && (
            <SectionCard
              title="Maintenance due"
              subtitle="Facilities needing service"
              icon="handyman"
              action={
                <Link href="/admin/facilities" className="text-xs font-semibold text-primary hover:underline">
                  Facilities
                </Link>
              }
              padded={false}
            >
              <ul className="divide-y divide-outline-variant/30">
                {stats.upcomingMaintenanceList.slice(0, 5).map((f) => (
                  <li key={f.facility_id}>
                    <Link
                      href="/admin/facilities"
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-container-high/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">
                          {f.facility_name}
                          {f.isClosed && (
                            <span className="ml-2 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              Closed
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] text-on-surface-variant">{f.facility_type}</p>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-semibold tabular-nums ${f.isOverdue ? "text-rose-300" : "text-amber-300"}`}
                      >
                        {f.isOverdue
                          ? `${Math.abs(f.daysAway)} day${Math.abs(f.daysAway) === 1 ? "" : "s"} overdue`
                          : f.daysAway === 0
                          ? "Due today"
                          : `in ${f.daysAway} day${f.daysAway === 1 ? "" : "s"}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard title="Quick actions" icon="bolt" padded={false}>
            <ul className="divide-y divide-outline-variant/30">
              {QUICK_ACTIONS.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high/50"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">{a.icon}</span>
                    {a.label}
                    <span className="material-symbols-outlined ml-auto text-[16px] text-on-surface-variant">
                      chevron_right
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
