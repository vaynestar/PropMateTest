"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface MaintenanceReportViewProps {
  data: any;
}

const CATEGORY_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#f43f5e"];

export default function MaintenanceReportView({ data }: MaintenanceReportViewProps) {
  const { maintenance } = data;
  const { categoryBreakdown, priorityBreakdown, unresolvedUrgentTickets } = maintenance;

  return (
    <div className="space-y-6">
      {/* 4 Helpdesk KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4">
          <span className="text-xs text-on-surface-variant font-medium block">Tickets raised</span>
          <span className="text-lg font-bold sm:text-2xl text-white mt-1 block">
            {maintenance.totalTickets}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">In this period</span>
        </div>

        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4">
          <span className="text-xs text-emerald-400 font-medium block">Resolved</span>
          <span className="text-lg font-bold sm:text-2xl text-emerald-300 mt-1 block">
            {maintenance.resolvedCount}
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">
            {maintenance.resolutionRate}% of tickets raised
          </span>
        </div>

        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4">
          <span className="text-xs text-amber-400 font-medium block">Still open</span>
          <span className="text-lg font-bold sm:text-2xl text-amber-300 mt-1 block">
            {maintenance.inProgressCount + maintenance.openCount}
          </span>
          <span className="text-[11px] text-amber-500/80 mt-1 block">Someone still has work to do</span>
        </div>

        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-3 sm:p-4">
          <span className="text-xs text-on-surface-variant font-medium block">Average time to resolve</span>
          <span className="text-lg font-mono font-bold sm:text-2xl text-primary mt-1 block">
            {maintenance.avgResolutionHours}h
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">From raised to resolved</span>
        </div>
      </div>

      {/* 2 Visualizations: Category Bar Chart & Priority Split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Ticket Volume by Category (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">What residents report</h3>
            <p className="text-[11px] text-on-surface-variant">Tickets by category</p>
          </div>

          <div className="w-full pt-4 min-h-[300px]">
            {categoryBreakdown && categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, categoryBreakdown.length * 36)}>
                <BarChart
                  layout="vertical"
                  data={categoryBreakdown}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tick={{ fill: "#cbd5e1" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161b26",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#ffffff",
                    }}
                    itemStyle={{ color: "#ffffff" }}
                    labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                    formatter={(val: any) => [`${val} tickets`, "Total Logged"]}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {categoryBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-on-surface-variant py-12">
                No maintenance tickets found for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Priority & Urgency Distribution (1 Col) */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Priority Distribution</h3>
            <p className="text-[11px] text-on-surface-variant">Urgency level breakdown</p>
          </div>

          <div className="space-y-4 my-auto py-2">
            {priorityBreakdown?.map((p: any) => {
              const total = maintenance.totalTickets || 1;
              const pct = Math.round((p.value / total) * 100);
              const colorClass =
                p.name === "Urgent"
                  ? "bg-rose-500 text-rose-300"
                  : p.name === "High"
                  ? "bg-amber-500 text-amber-300"
                  : p.name === "Normal"
                  ? "bg-primary text-primary"
                  : "bg-gray-500 text-gray-300";

              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className="text-on-surface-variant">{p.value} tickets ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colorClass.split(" ")[0]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant/30 text-[11px] text-on-surface-variant mt-2">
            <span className="font-semibold text-white">SLA Target:</span> Urgent tickets targeted for initial assessment within 4 hours.
          </div>
        </div>
      </div>

      {/* Unresolved High-Priority Backlog Table */}
      <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
        <div className="pb-3 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Active High-Priority Tickets</h3>
            <p className="text-[11px] text-on-surface-variant">Tickets currently requiring management attention</p>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {unresolvedUrgentTickets.length} pending
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-lowest text-on-surface-variant text-[10px] tracking-wider border-b border-outline-variant/60">
              <tr>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Reporter</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {unresolvedUrgentTickets && unresolvedUrgentTickets.length > 0 ? (
                unresolvedUrgentTickets.map((t: any) => (
                  <tr key={t.ticket_id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{t.title}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{t.ticket_category}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {t.location_detail || (t.unit ? `Unit ${t.unit.unit_number}` : "Common Area")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === "Urgent" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{t.reporter?.user_name || "Resident"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-on-surface border border-outline-variant/50">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-emerald-400 font-medium">
                    ✓ No high-priority tickets pending.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
