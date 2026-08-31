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

interface VisitorsReportViewProps {
  data: any;
}

const VISITOR_TYPE_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f43f5e"];

export default function VisitorsReportView({ data }: VisitorsReportViewProps) {
  const { visitors } = data;
  const { trafficTrend, typeDistribution, activeVisitorsList } = visitors;

  return (
    <div className="space-y-6">
      {/* 4 Visitor KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-on-surface-variant font-medium block">Total Visitor Passes</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {visitors.totalVisitors}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Passes created & processed</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-purple-400 font-medium block">Currently Inside (Active)</span>
          <span className="text-2xl font-bold text-purple-300 mt-1 block">
            {visitors.activeInside}
          </span>
          <span className="text-[11px] text-purple-400/80 mt-1 block">Checked-in on property</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-emerald-400 font-medium block">Completed Checkouts</span>
          <span className="text-2xl font-bold text-emerald-300 mt-1 block">
            {visitors.totalVisitors - visitors.activeInside}
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">Exit clearance granted</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-on-surface-variant font-medium block">Active Visitor Types</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {typeDistribution?.length || 0}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Guest, delivery, contractor</span>
        </div>
      </div>

      {/* 2 Visualizations: Daily Traffic Trend & Visitor Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Traffic Area Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Daily Guardhouse Entry Traffic</h3>
            <p className="text-[11px] text-on-surface-variant">Visitor registration and entry volume over time</p>
          </div>

          <div className="h-64 w-full pt-4">
            {trafficTrend && trafficTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
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
                    formatter={(val: any) => [`${val} visitors`, "Entry Volume"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#visitorGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-on-surface-variant">
                No visitor traffic logged for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Visitor Type Pie Chart (1 Col) */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Visitor Classification</h3>
            <p className="text-[11px] text-on-surface-variant">Breakdown by visitor entry purpose</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center my-auto">
            {typeDistribution && typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {typeDistribution.map((entry: any, index: number) => (
                      <Cell key={`type-${index}`} fill={VISITOR_TYPE_COLORS[index % VISITOR_TYPE_COLORS.length]} />
                    ))}
                  </Pie>
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
                    formatter={(val: any) => [`${val} visitors`, "Total"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-on-surface-variant">No visitor data.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-outline-variant/30 text-xs">
            {typeDistribution?.map((t: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VISITOR_TYPE_COLORS[idx % VISITOR_TYPE_COLORS.length] }} />
                <span>{t.type}: {t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active On-Site Visitors Audit Table */}
      <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
        <div className="pb-3 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Active On-Site Visitors Audit</h3>
            <p className="text-[11px] text-on-surface-variant">Visitors currently checked-in inside the property</p>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {visitors.activeInside} inside
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-lowest text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/60">
              <tr>
                <th className="px-4 py-2.5">Visitor Name</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">IC / ID</th>
                <th className="px-4 py-2.5">Vehicle Plate</th>
                <th className="px-4 py-2.5">Destination</th>
                <th className="px-4 py-2.5 text-right">Check-In Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {activeVisitorsList && activeVisitorsList.length > 0 ? (
                activeVisitorsList.map((v: any) => (
                  <tr key={v.visitor_id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{v.visitor_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-high text-primary border border-primary/20">
                        {v.visitor_type || "Guest"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{v.visitor_ic_no || "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-amber-300">{v.vehicle_plate || "N/A"}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {v.destination || (v.lease?.unit ? `Unit ${v.lease.unit.unit_number}` : "General")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      {v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-emerald-400 font-medium">
                    ✓ No active visitors currently checked-in on premises.
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
