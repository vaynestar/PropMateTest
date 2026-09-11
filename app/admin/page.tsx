import Link from "next/link";
import UrgentActionList from "@/components/dashboard/UrgentActionList";
import { getDashboardStats } from "@/lib/dashboard";
import ScanButton from "@/components/visitors/ScanButton";
import FilterableTicketQueue from "@/components/dashboard/FilterableTicketQueue";
import FinancialTrendChart from "@/components/dashboard/FinancialTrendChart";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const propertyId = (await getActivePropertyId()) ?? undefined;
  const stats = await getDashboardStats(propertyId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Dashboard
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            What needs your attention today.
          </p>
        </div>

        {/* Header Fast Actions */}
        <div className="flex items-center gap-2.5">
          <ScanButton />
          <Link
            href="/admin/reports"
            className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors pressable"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
            <span>Reports</span>
          </Link>
        </div>
      </div>

      {/* 2. Urgent Attention Banner (If Critical Items Exist) */}
      {stats.urgentActionItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-surface-container border border-rose-500/40 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-[20px]">
                warning
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Needs attention ({stats.urgentActionItems.length})
              </h2>
            </div>
            <span className="text-[11px] text-rose-300 font-semibold bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-md">
            </span>
          </div>

          <UrgentActionList items={stats.urgentActionItems as any} />
        </div>
      )}

      {/* 3. Four Core Live Pulse Scorecards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Scorecard 1: Occupancy Rate */}
        <Link
          href="/admin/units"
          className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4 hover:border-primary/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-on-surface-variant font-medium">Occupancy</span>
            <span className="material-symbols-outlined text-[18px] text-primary group-hover:scale-110 transition-transform">
              home_work
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold sm:text-2xl text-white font-mono">{stats.occupancyRate}%</span>
              <span className="text-xs text-on-surface-variant font-mono">
                {stats.occupiedUnits} of {stats.totalUnits} units
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.occupancyRate}%` }}
              />
            </div>
          </div>
        </Link>

        {/* Scorecard 2: Cash Collected Today */}
        <Link
          href="/admin/invoices"
          className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4 hover:border-emerald-500/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-emerald-400 font-medium">Today&apos;s Collections</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400 group-hover:scale-110 transition-transform">
              payments
            </span>
          </div>
          <div>
            <span className="text-xl font-bold sm:text-2xl text-emerald-300 font-mono">
              RM {stats.todayCollectedAmount.toFixed(2)}
            </span>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-outline-variant/30 text-on-surface-variant">
              <span>Overdue</span>
              <span className="font-mono font-bold text-rose-300">
                RM {stats.outstandingAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </Link>

        {/* Scorecard 3: Active Visitors On-Site */}
        {/* Emerald, because that is what "On site" is everywhere else (lib/visitor-status.ts, Checked In). This figure was purple, so one state had two colours across three screens. */}
        <Link
          href="/admin/visitors"
          className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4 hover:border-emerald-500/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-emerald-400 font-medium">Visitors on site</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400 group-hover:scale-110 transition-transform">
              badge
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold sm:text-2xl text-emerald-300 font-mono">
                {stats.activeVisitorsCount}
              </span>
              <span className="text-xs text-emerald-400/80">right now</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-outline-variant/30 text-on-surface-variant">
              <span>Guardhouse</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Open</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Scorecard 4: Open Helpdesk Backlog */}
        <Link
          href="/admin/maintenance"
          className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4 hover:border-amber-500/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-amber-400 font-medium">Open tickets</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400 group-hover:scale-110 transition-transform">
              build
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold sm:text-2xl text-white font-mono">{stats.openTickets}</span>
              <span className="text-xs text-on-surface-variant">unresolved</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-outline-variant/30">
              <span className="text-on-surface-variant">Urgent or high</span>
              <span className="text-amber-300 font-mono font-bold">
                {stats.urgentTicketsCount}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* 5. Two-Column Real-Time Operational Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Financial Performance Trend Chart & Active Ticket Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Performance Area/Line Chart */}
          <FinancialTrendChart data={stats.financialTrend} />

          {/* Active Maintenance Queue */}
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Work in progress</h3>
                <p className="text-[11px] text-on-surface-variant">
                  Tickets that are open or being worked on.
                </p>
              </div>
              <Link
                href="/admin/maintenance"
                className="text-xs text-primary hover:underline font-semibold"
              >
                View all tickets
              </Link>
            </div>

            <FilterableTicketQueue tickets={stats.openTicketsList} />
          </div>
        </div>

        {/* Right Column (1 Col): Live Activity Stream */}
        <div className="space-y-6">
          {/* Live Operational Activity Stream */}
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Recent activity</h3>
                <p className="text-[11px] text-on-surface-variant">What happened today</p>
              </div>
            </div>

            <div className="space-y-3">
              {stats.activityFeed.length > 0 ? (
                stats.activityFeed.map((event) => (
                  <div
                    key={event.id}
                    className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/40 flex items-start gap-2.5 text-xs"
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                        event.type === "VISITOR"
                          ? "text-purple-400"
                          : event.type === "TICKET"
                          ? "text-amber-400"
                          : event.type === "PAYMENT"
                          ? "text-emerald-400"
                          : "text-primary"
                      }`}
                    >
                      {event.type === "VISITOR"
                        ? "badge"
                        : event.type === "TICKET"
                        ? "build"
                        : event.type === "PAYMENT"
                        ? "payments"
                        : "campaign"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-white truncate block">
                          {event.title}
                        </span>
                        <span className="text-[10px] text-on-surface-variant shrink-0 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant truncate block">
                        {event.detail}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-on-surface-variant/70 text-xs flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[24px] opacity-40">notifications_off</span>
                  <span>Nothing has happened today yet.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Facilities due for service. Overdue first — an overdue service is the
          one that needs a decision, and the counter above excludes it. */}
      {stats.upcomingMaintenanceList.length > 0 && (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber-400">build</span>
              <h2 className="text-sm font-bold text-white">Maintenance due</h2>
            </div>
            <Link
              href="/admin/facilities"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Facilities
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.upcomingMaintenanceList.map((f) => (
              <Link
                key={f.facility_id}
                href="/admin/facilities"
                className={`pressable rounded-xl border p-3 transition-colors ${
                  f.isOverdue
                    ? "border-rose-500/40 bg-rose-500/10 hover:border-rose-500/60"
                    : "border-outline-variant/50 bg-surface-container-high/40 hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-white">
                    {f.facility_name}
                  </span>
                  {f.isClosed && (
                    <span className="shrink-0 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                      Closed
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">{f.facility_type}</p>
                <p
                  className={`mt-1.5 font-mono text-[11px] font-bold ${
                    f.isOverdue ? "text-rose-300" : "text-amber-300"
                  }`}
                >
                  {f.isOverdue
                    ? `${Math.abs(f.daysAway)} day${Math.abs(f.daysAway) === 1 ? "" : "s"} overdue`
                    : f.daysAway === 0
                    ? "Due today"
                    : `In ${f.daysAway} day${f.daysAway === 1 ? "" : "s"}`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}


      {/* 4. Fast Action Matrix */}
      <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-on-surface-variant font-semibold shrink-0">Quick actions</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/maintenance"
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-amber-400">add_task</span>
            <span>Raise Ticket</span>
          </Link>

          <Link
            href="/admin/invoices"
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-400">receipt_long</span>
            <span>Issue Invoice</span>
          </Link>

          <Link
            href="/admin/announcements"
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-purple-400">campaign</span>
            <span>Post Notice</span>
          </Link>

          <Link
            href="/admin/facilities"
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-cyan-400">calendar_month</span>
            <span>Facility Schedule</span>
          </Link>

          <Link
            href="/admin/settings"
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-on-surface-variant">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
