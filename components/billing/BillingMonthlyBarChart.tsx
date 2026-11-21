"use client";

import { useState } from "react";
import { monthYear } from "@/lib/short-date";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Billed against collected (rebuilt DEV-258, to the batch-1 artboard).
 *
 * Four things were wrong with it.
 *
 *   · It drew its own card and its own heading inside the card that already
 *     had one, so the page said "Collected vs outstanding" twice, with the
 *     same subtitle underneath each.
 *   · Every bar was rose. Unpaid is the normal state of an invoice raised
 *     this week, so a chart that paints it alarm-red paints six months of
 *     ordinary billing as a crisis and the colour stops meaning anything.
 *     Collected is emerald; still owed is a quiet slate.
 *   · A minimum bar height of 15% meant a RM 100 month next to a RM 11,500
 *     month was drawn at a seventh of its height rather than a hundredth.
 *     A chart whose job is proportion must not lie about proportion.
 *   · `scale-105` and a sky-blue glow on hover, on a chart with no hover
 *     target — plus the amount printed inside each segment and again above
 *     the bar.
 */
export default function BillingMonthlyBarChart({ invoices }: { invoices: any[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const byMonth: Record<
    string,
    { monthLabel: string; dateVal: number; total: number; paid: number; unpaid: number; paidCount: number; unpaidCount: number }
  > = {};

  invoices.forEach((inv) => {
    const key = monthYear(inv.invoice_date);
    const amount = Number(inv.total_amount) || 0;
    byMonth[key] ??= {
      monthLabel: key,
      dateVal: new Date(inv.invoice_date).getTime(),
      total: 0,
      paid: 0,
      unpaid: 0,
      paidCount: 0,
      unpaidCount: 0,
    };
    byMonth[key].total += amount;
    if (inv.status === "Paid") {
      byMonth[key].paid += amount;
      byMonth[key].paidCount += 1;
    } else {
      byMonth[key].unpaid += amount;
      byMonth[key].unpaidCount += 1;
    }
  });

  const months = Object.values(byMonth).sort((a, b) => a.dateVal - b.dateVal);
  if (months.length === 0) return null;

  const maxTotal = Math.max(...months.map((m) => m.total), 1);
  const PLOT = 180;

  return (
    <div>
      <div className="flex h-[232px] items-end gap-3 sm:gap-4">
        {months.map((m) => {
          const isHovered = hovered === m.monthLabel;
          // A 4px floor, not 15% — enough that a tiny month is still visible
          // and clickable, small enough that it cannot be mistaken for scale.
          const h = Math.max(4, Math.round((m.total / maxTotal) * PLOT));
          const paidPct = m.total > 0 ? (m.paid / m.total) * 100 : 0;

          return (
            <div
              key={m.monthLabel}
              onMouseEnter={() => setHovered(m.monthLabel)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
            >
              {isHovered && (
                <div className="pointer-events-none absolute bottom-[calc(100%-12px)] left-1/2 z-30 w-[200px] -translate-x-1/2 rounded-xl border border-outline-variant bg-surface-container-highest p-3 text-xs shadow-2xl">
                  <div className="mb-2 flex items-center justify-between border-b border-outline-variant/40 pb-1.5 text-sm font-bold text-on-surface">
                    <span>{m.monthLabel}</span>
                    <span className="tabular-nums text-on-surface-variant">{formatCurrency(m.total)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-medium text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Collected
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatCurrency(m.paid)} ({m.paidCount})
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-medium text-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#3b4560]" />
                        Still owed
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatCurrency(m.unpaid)} ({m.unpaidCount})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Six "RM 11,530" labels will not fit across a phone, and
                  forcing them to wrap turns the plot into text. The runs
                  table directly below carries every one of these figures. */}
              <span className="hidden whitespace-nowrap text-center text-[11px] tabular-nums text-on-surface-variant sm:block">
                {formatCurrency(m.total)}
              </span>

              <div
                style={{ height: `${h}px` }}
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-md transition-opacity"
              >
                <div style={{ height: `${100 - paidPct}%` }} className="w-full bg-[#3b4560]" />
                <div style={{ height: `${paidPct}%` }} className="w-full bg-emerald-400" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-3 border-t border-outline-variant/40 pt-2 sm:gap-4">
        {months.map((m) => (
          <span
            key={m.monthLabel}
            className="min-w-0 flex-1 truncate text-center text-[11px] text-on-surface-variant"
          >
            {m.monthLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
