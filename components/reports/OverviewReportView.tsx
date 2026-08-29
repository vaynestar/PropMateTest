"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface OverviewReportViewProps {
  data: any;
}

const OCCUPANCY_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6b7280"];

export default function OverviewReportView({ data }: OverviewReportViewProps) {
  const { overview, financial, maintenance, visitors } = data;

  const occupancyPieData = [
    { name: "Occupied", value: overview.occupiedUnitsCount },
    { name: "Vacant", value: overview.vacantUnitsCount },
    { name: "Maintenance", value: overview.maintenanceUnitsCount },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* 4 Core Scorecard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Financial Collection */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              Collection Rate
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {overview.collectionRate}%
            </span>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Collected: RM {overview.totalCollectedAmount.toLocaleString()}</span>
              <span>Invoiced: RM {overview.totalInvoicedAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Occupancy Rate */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              Unit Occupancy
            </span>
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">apartment</span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {overview.occupancyRate}%
            </span>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Occupied: {overview.occupiedUnitsCount}</span>
              <span>Total: {overview.totalUnitsCount} units</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Ticket Resolution Rate */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              Helpdesk Resolution
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">build</span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {overview.resolutionRate}%
            </span>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Resolved: {overview.resolvedTicketsCount}/{overview.totalTickets}</span>
              <span>MTTR: ~{overview.avgResolutionHours}h</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Active Visitors */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">
              Visitors On-Site
            </span>
            <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {overview.activeCheckedInCount}
            </span>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Total Logged: {overview.totalVisitorsCount}</span>
              <span>Checked Out: {overview.checkedOutCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Analytical Cards: Financial Cashflow vs Occupancy Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cashflow Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Cashflow & Collections</h3>
              <p className="text-[11px] text-on-surface-variant">Invoiced billed amounts vs total paid collections</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                Invoiced
              </span>
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                Collected
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {financial.trend && financial.trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financial.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `RM${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b26",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(value: any) => [`RM ${Number(value).toLocaleString()}`, ""]}
                  />
                  <Area type="monotone" dataKey="invoiced" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#invoicedGrad)" name="Invoiced" />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#collectedGrad)" name="Collected" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-on-surface-variant">
                No billing records found for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Occupancy Donut (1 Col) */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Unit Occupancy Breakdown</h3>
            <p className="text-[11px] text-on-surface-variant">Inventory status across units</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center my-auto">
            {occupancyPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {occupancyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={OCCUPANCY_COLORS[index % OCCUPANCY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b26",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-on-surface-variant">No unit records.</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-white">{overview.occupancyRate}%</span>
              <span className="text-[10px] text-on-surface-variant uppercase font-medium">Occupied</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-outline-variant/30 text-center text-xs">
            <div>
              <span className="text-[10px] text-emerald-400 block font-bold">Occupied</span>
              <span className="font-semibold text-white">{overview.occupiedUnitsCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-400 block font-bold">Vacant</span>
              <span className="font-semibold text-white">{overview.vacantUnitsCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-400 block font-bold">Maintenance</span>
              <span className="font-semibold text-white">{overview.maintenanceUnitsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Tables: Urgent Attention Tickets & Top Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Urgent Tickets */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div>
              <h3 className="text-sm font-bold text-white">High-Priority Helpdesk Backlog</h3>
              <p className="text-[11px] text-on-surface-variant">Open issues requiring prompt resolution</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              {maintenance.unresolvedUrgentTickets.length} pending
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {maintenance.unresolvedUrgentTickets.length > 0 ? (
              maintenance.unresolvedUrgentTickets.map((t: any) => (
                <div
                  key={t.ticket_id}
                  className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-white truncate block">{t.title}</span>
                    <span className="text-[11px] text-on-surface-variant truncate block">
                      {t.ticket_category} • {t.location_detail || (t.unit ? `Unit ${t.unit.unit_number}` : "Common Area")}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {t.priority}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-emerald-400 font-medium">
                ✓ No high-priority tickets pending.
              </div>
            )}
          </div>
        </div>

        {/* Top Overdue Accounts */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div>
              <h3 className="text-sm font-bold text-white">Outstanding Arrears</h3>
              <p className="text-[11px] text-on-surface-variant">Units with overdue balances</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              RM {overview.totalOverdueAmount.toLocaleString()} total
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {financial.topDefaulters && financial.topDefaulters.length > 0 ? (
              financial.topDefaulters.map((d: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-white">Unit {d.unitNumber}</span>
                    <span className="text-[11px] text-on-surface-variant block truncate">
                      {d.tenantName} • {d.maxDaysOverdue} days overdue
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-300 text-xs shrink-0">
                    RM {d.overdueAmount.toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-emerald-400 font-medium">
                ✓ All billed accounts are currently in good standing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
