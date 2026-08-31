"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FinancialTrendChartProps {
  data: {
    month: string;
    invoiced: number;
    collected: number;
  }[];
}

export default function FinancialTrendChart({ data }: FinancialTrendChartProps) {
  const hasData = data && data.length > 0;

  return (
    <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">show_chart</span>
            <h3 className="text-sm font-bold text-white tracking-tight">Financial Performance Trend</h3>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Billed maintenance invoices vs actual paid cash collections
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-on-surface-variant font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
            Billed (RM)
          </span>
          <span className="flex items-center gap-1.5 text-on-surface-variant font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
            Collected (RM)
          </span>
        </div>
      </div>

      <div className="h-64 w-full pt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardInvoicedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dashboardCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `RM${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#161b26",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "#ffffff",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                }}
                itemStyle={{ color: "#ffffff" }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
                formatter={(value: any) => [`RM ${Number(value).toLocaleString()}`, ""]}
              />
              <Area
                type="monotone"
                dataKey="invoiced"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#dashboardInvoicedGrad)"
                name="Billed Invoices"
              />
              <Area
                type="monotone"
                dataKey="collected"
                stroke="#34d399"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#dashboardCollectedGrad)"
                name="Paid Collections"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-xs text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-[28px] opacity-40">query_stats</span>
            <span>No financial billing history recorded yet.</span>
          </div>
        )}
      </div>
    </div>
  );
}
