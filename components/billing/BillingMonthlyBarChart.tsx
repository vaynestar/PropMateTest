"use client";

import { useState } from "react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthYearKey(date: Date | string) {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function BillingMonthlyBarChart({ invoices }: { invoices: any[] }) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Group invoices by month-year
  const monthlyDataMap: Record<
    string,
    { monthLabel: string; dateVal: number; total: number; paid: number; unpaid: number; paidCount: number; unpaidCount: number }
  > = {};

  invoices.forEach((inv) => {
    const key = getMonthYearKey(inv.invoice_date);
    const dateVal = new Date(inv.invoice_date).getTime();
    const amount = Number(inv.total_amount) || 0;
    const isPaid = inv.status === "Paid";

    if (!monthlyDataMap[key]) {
      monthlyDataMap[key] = {
        monthLabel: key,
        dateVal,
        total: 0,
        paid: 0,
        unpaid: 0,
        paidCount: 0,
        unpaidCount: 0,
      };
    }

    monthlyDataMap[key].total += amount;
    if (isPaid) {
      monthlyDataMap[key].paid += amount;
      monthlyDataMap[key].paidCount += 1;
    } else {
      monthlyDataMap[key].unpaid += amount;
      monthlyDataMap[key].unpaidCount += 1;
    }
  });

  // Sort chronologically (ascending date)
  const sortedMonths = Object.values(monthlyDataMap).sort((a, b) => a.dateVal - b.dateVal);

  if (sortedMonths.length === 0) {
    return null;
  }

  // Find max total to scale bar heights dynamically
  const maxTotal = Math.max(...sortedMonths.map((m) => m.total), 1);

  return (
    <div className="glass-card rounded-xl p-6 flex flex-col gap-4 border border-outline-variant/30 animate-fade-in">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">bar_chart</span>
            Collected vs outstanding
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Each month’s invoices, split by what has actually been paid.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500 inline-block shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
            <span className="text-on-surface">Paid (Collected)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            <span className="text-on-surface">Unpaid (Outstanding)</span>
          </div>
        </div>
      </div>

      {/* Chart Bars Grid */}
      <div className="pt-8 pb-2 px-2 flex items-end justify-center md:justify-start gap-4 sm:gap-6 h-64 relative overflow-visible">
        {sortedMonths.map((m) => {
          const isHovered = hoveredMonth === m.monthLabel;

          // Compute percentage heights relative to maxTotal (min 15% height for visual clarity)
          const totalHeightPercent = Math.max((m.total / maxTotal) * 100, 15);
          const paidRatio = m.total > 0 ? (m.paid / m.total) * 100 : 0;
          const unpaidRatio = 100 - paidRatio;

          return (
            <div
              key={m.monthLabel}
              onMouseEnter={() => setHoveredMonth(m.monthLabel)}
              onMouseLeave={() => setHoveredMonth(null)}
              className="w-16 sm:w-20 flex flex-col items-center group relative h-full justify-end cursor-pointer"
            >
              {/* Tooltip Popup on Hover */}
              {isHovered && (
                <div className="absolute bottom-[calc(100%+14px)] z-30 bg-surface-container-highest border border-outline-variant rounded-xl p-3 shadow-2xl min-w-[200px] text-xs animate-fade-in pointer-events-none">
                  <div className="font-bold text-on-surface text-sm border-b border-outline-variant/40 pb-1.5 mb-2 flex justify-between items-center">
                    <span>{m.monthLabel}</span>
                    <span className="text-primary font-mono">{formatCurrency(m.total)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sky-400 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Paid:
                      </span>
                      <span className="font-mono font-bold">{formatCurrency(m.paid)} ({m.paidCount})</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-400 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Unpaid:
                      </span>
                      <span className="font-mono font-bold">{formatCurrency(m.unpaid)} ({m.unpaidCount})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Amount Label on Top of Bar */}
              <span className="text-xs sm:text-sm font-bold font-mono text-on-surface group-hover:text-primary mb-2 transition-colors bg-surface-container-high/80 px-2 py-0.5 rounded-md border border-outline-variant/40 shadow-sm whitespace-nowrap">
                {formatCurrency(m.total)}
              </span>

              {/* Single Stacked Bar Container */}
              <div
                style={{ height: `${totalHeightPercent}%` }}
                className="w-full max-w-[56px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.2)] border border-outline-variant/30"
              >
                {/* Unpaid Section (Red) at Top of Bar */}
                {m.unpaid > 0 && (
                  <div
                    style={{ height: `${unpaidRatio}%` }}
                    className="w-full bg-rose-500 hover:bg-rose-400 transition-colors relative flex items-center justify-center group/unpaid"
                    title={`Unpaid: ${formatCurrency(m.unpaid)}`}
                  >
                    {unpaidRatio > 18 && (
                      <span className="text-[9px] font-bold text-white tracking-tighter truncate px-1">
                        {formatCurrency(m.unpaid)}
                      </span>
                    )}
                  </div>
                )}

                {/* Paid Section (Blue) at Bottom of Bar */}
                {m.paid > 0 && (
                  <div
                    style={{ height: `${paidRatio}%` }}
                    className="w-full bg-sky-500 hover:bg-sky-400 transition-colors relative flex items-center justify-center group/paid"
                    title={`Paid: ${formatCurrency(m.paid)}`}
                  >
                    {paidRatio > 18 && (
                      <span className="text-[9px] font-bold text-white tracking-tighter truncate px-1">
                        {formatCurrency(m.paid)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Month X-Axis Label */}
              <span className="text-xs font-semibold text-on-surface-variant mt-2 group-hover:text-on-surface transition-colors">
                {m.monthLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
