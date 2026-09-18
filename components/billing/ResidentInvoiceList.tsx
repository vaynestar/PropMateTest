"use client";

import Link from "next/link";
import { useState } from "react";

export type ResidentInvoiceRow = {
  id: string;
  invoiceNo: string;
  period: string; // "Aug 2026"
  amount: string; // "RM 5,000.00"
  due: string; // "1 Aug 2026"
  unit: string;
  state: "overdue" | "unpaid" | "checking" | "paid" | "voided";
  daysLate: number;
};

const STATE: Record<ResidentInvoiceRow["state"], { label: string; chip: string; stripe: string; icon: string }> = {
  overdue: { label: "Overdue", chip: "bg-rose-500/20 text-rose-200 border-rose-400/50", stripe: "bg-rose-500", icon: "error" },
  unpaid: { label: "Unpaid", chip: "bg-amber-500/15 text-amber-200 border-amber-400/40", stripe: "bg-amber-400", icon: "schedule" },
  checking: { label: "Being checked", chip: "bg-sky-500/15 text-sky-200 border-sky-400/40", stripe: "bg-sky-400", icon: "hourglass_top" },
  paid: { label: "Paid", chip: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40", stripe: "bg-emerald-400", icon: "check_circle" },
  voided: { label: "Voided", chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant", stripe: "bg-outline-variant", icon: "block" },
};

/**
 * Resident invoice list (DEV-187; user: "Please refine the design for invoice").
 * To pay / Paid / All tabs; each card leads with the billing month and amount,
 * a coloured stripe and chip for its state (overdue, unpaid, being checked,
 * paid), and the due date - red with days late when overdue.
 */
export default function ResidentInvoiceList({ rows }: { rows: ResidentInvoiceRow[] }) {
  const toPay = rows.filter((r) => r.state === "overdue" || r.state === "unpaid" || r.state === "checking");
  const paid = rows.filter((r) => r.state === "paid" || r.state === "voided");
  const [tab, setTab] = useState<"pay" | "paid" | "all">(toPay.length ? "pay" : "all");
  const shown = tab === "pay" ? toPay : tab === "paid" ? paid : rows;

  const tabs: { id: typeof tab; label: string; count: number }[] = [
    { id: "pay", label: "To pay", count: toPay.length },
    { id: "paid", label: "Paid", count: paid.length },
    { id: "all", label: "All", count: rows.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5 bg-surface-container-high p-1.5 rounded-2xl border border-outline-variant/40">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all pressable ${
              tab === t.id ? "bg-primary text-black shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.label}
            <span className={`text-[11px] px-1.5 rounded-full ${tab === t.id ? "bg-black/20" : "bg-surface-container-highest"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] opacity-50">{tab === "pay" ? "celebration" : "receipt_long"}</span>
          <p className="text-sm mt-1">{tab === "pay" ? "You're all paid up." : "No invoices here yet."}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((r) => {
          const s = STATE[r.state];
          return (
            <Link
              key={r.id}
              href={`/resident/invoices/${r.id}`}
              className="relative pressable glass-card rounded-2xl border border-outline-variant/40 hover:border-primary/50 transition-colors overflow-hidden pl-5 pr-4 py-4 flex flex-col gap-3"
            >
              <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${s.stripe}`} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface-variant">
                    {r.period} <span className="font-normal">· {r.invoiceNo}</span>
                  </p>
                  <p className={`text-2xl font-bold tabular-nums mt-0.5 ${r.state === "paid" || r.state === "voided" ? "text-on-surface/70" : "text-on-surface"}`}>
                    {r.amount}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${s.chip}`}>
                  <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
                  {s.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-outline-variant/25 text-xs">
                <span className={`flex items-center gap-1 ${r.state === "overdue" ? "text-rose-300 font-semibold" : "text-on-surface-variant"}`}>
                  <span className="material-symbols-outlined text-[15px]">event</span>
                  Due {r.due}
                  {r.state === "overdue" && ` · ${r.daysLate} day${r.daysLate === 1 ? "" : "s"} late`}
                </span>
                <span className="flex items-center gap-0.5 font-bold text-primary">
                  {r.state === "overdue" || r.state === "unpaid" ? "View & pay" : "View"}
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
