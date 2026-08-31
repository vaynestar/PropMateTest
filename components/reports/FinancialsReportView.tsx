"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FinancialsReportViewProps {
  data: any;
}

const CHARGE_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

export default function FinancialsReportView({ data }: FinancialsReportViewProps) {
  const { financial } = data;
  const { agingReceivables, chargeDistribution, topDefaulters, trend } = financial;

  const agingData = [
    { name: "0-30 Days", amount: agingReceivables.current, color: "#10b981" },
    { name: "31-60 Days", amount: agingReceivables.days30, color: "#f59e0b" },
    { name: "61-90 Days", amount: agingReceivables.days60, color: "#f97316" },
    { name: "90+ Days", amount: agingReceivables.days90Plus, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-on-surface-variant font-medium block">Total Billed</span>
          <span className="text-2xl font-mono font-bold text-white mt-1 block">
            RM {financial.totalInvoiced.toLocaleString()}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Gross invoiced amount</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-emerald-400 font-medium block">Total Collected</span>
          <span className="text-2xl font-mono font-bold text-emerald-300 mt-1 block">
            RM {financial.totalCollected.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">
            {financial.collectionRate}% collection efficiency
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-rose-400 font-medium block">Total Overdue</span>
          <span className="text-2xl font-mono font-bold text-rose-300 mt-1 block">
            RM {financial.totalOverdue.toLocaleString()}
          </span>
          <span className="text-[11px] text-rose-400/80 mt-1 block">Uncollected balance past due</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60">
          <span className="text-xs text-on-surface-variant font-medium block">Severe Arrears (90d+)</span>
          <span className="text-2xl font-mono font-bold text-amber-300 mt-1 block">
            RM {agingReceivables.days90Plus.toLocaleString()}
          </span>
          <span className="text-[11px] text-on-surface-variant mt-1 block">Accounts requiring legal notice</span>
        </div>
      </div>

      {/* 2 Visualizations: Aging Receivables vs Charge Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Aging Receivables Bar */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Aged Receivables Breakdown</h3>
            <p className="text-[11px] text-on-surface-variant">Outstanding balances categorized by delay bracket</p>
          </div>

          <div className="h-56 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `RM${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
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
                  formatter={(val: any) => [`RM ${Number(val).toLocaleString()}`, "Outstanding"]}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charge Category Breakdown */}
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <div className="pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-bold text-white">Revenue by Charge Type</h3>
            <p className="text-[11px] text-on-surface-variant">Distribution across maintenance, sinking fund, water & facilities</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {chargeDistribution && chargeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chargeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chargeDistribution.map((entry: any, index: number) => (
                      <Cell key={`charge-${index}`} fill={CHARGE_COLORS[index % CHARGE_COLORS.length]} />
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
                    formatter={(val: any) => [`RM ${Number(val).toLocaleString()}`, "Billed"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-on-surface-variant">No charge records.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-outline-variant/30">
            {chargeDistribution?.map((c: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHARGE_COLORS[idx % CHARGE_COLORS.length] }} />
                <span>{c.name}: RM {c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Defaulters Table */}
      <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60">
        <div className="pb-3 border-b border-outline-variant/30">
          <h3 className="text-sm font-bold text-white">Top Outstanding Accounts</h3>
          <p className="text-[11px] text-on-surface-variant">Units with the highest accumulated overdue balances</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-lowest text-on-surface-variant uppercase text-[10px] tracking-wider border-b border-outline-variant/60">
              <tr>
                <th className="px-4 py-2.5">Unit</th>
                <th className="px-4 py-2.5">Resident</th>
                <th className="px-4 py-2.5">Property</th>
                <th className="px-4 py-2.5">Unpaid Invoices</th>
                <th className="px-4 py-2.5">Longest Overdue</th>
                <th className="px-4 py-2.5 text-right">Amount Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {topDefaulters && topDefaulters.length > 0 ? (
                topDefaulters.map((d: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-white">Unit {d.unitNumber}</td>
                    <td className="px-4 py-3 text-on-surface">{d.tenantName}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{d.propertyName}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{d.unpaidInvoicesCount} invoices</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.maxDaysOverdue > 60 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {d.maxDaysOverdue} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-300">
                      RM {d.overdueAmount.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-emerald-400 font-medium">
                    ✓ No overdue accounts found for this period.
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
