"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, colourFor } from "@/lib/chart-colours";

/**
 * Small dashboard infographics (DEV-194; user: "try to make other info at
 * dashboard to be infographic as much as possible").
 *
 * One palette, used the same way everywhere: purple is the neutral series,
 * emerald means settled/arrived, amber means waiting, rose means a problem.
 */
const tooltipStyle = {
  contentStyle: {
    background: "#161a23",
    border: "1px solid #2b3040",
    borderRadius: 12,
    fontSize: 12,
    color: "#e6e8ee",
  },
  labelStyle: { color: "#9aa2b4", fontSize: 11 },
};

/** Unit status as a donut, with the occupancy figure in the middle. */
export function UnitMixDonut({
  data,
  centreValue,
  centreLabel,
}: {
  data: { label: string; count: number }[];
  centreValue: string;
  centreLabel: string;
}) {
  const total = data.reduce((n, d) => n + d.count, 0);
  if (!total) return <p className="py-6 text-center text-xs text-on-surface-variant">No units recorded yet.</p>;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={44}
              outerRadius={66}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={d.label} fill={colourFor(d.label, i)} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} units`, String(n)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-white">{centreValue}</span>
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{centreLabel}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colourFor(d.label, i) }} />
            <span className="min-w-0 flex-1 truncate text-on-surface-variant">{d.label}</span>
            <span className="tabular-nums font-semibold text-on-surface">{d.count}</span>
            <span className="w-10 shrink-0 text-right tabular-nums text-on-surface-variant">
              {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Visitors expected vs actually arrived, last seven days. */
export function VisitorTrendChart({ data }: { data: { day: string; expected: number; arrived: number }[] }) {
  const empty = data.every((d) => d.expected === 0);
  if (empty) return <p className="py-6 text-center text-xs text-on-surface-variant">No visitors in the last week.</p>;

  return (
    <div className="h-[150px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -26, bottom: 0 }} barGap={2}>
          <XAxis dataKey="day" tick={{ fill: "#9aa2b4", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#9aa2b4", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={38} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
          <Bar dataKey="expected" name="Expected" fill={CHART.primary} radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="arrived" name="Arrived" fill={CHART.positive} radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
