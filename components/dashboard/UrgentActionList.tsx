"use client";

import Link from "next/link";
import { useState } from "react";
import TicketDetailModal from "@/components/maintenance/TicketDetailModal";

/**
 * The "needs attention" strip.
 *
 * A ticket row used to be a link straight into the Helpdesk list, which meant
 * leaving the dashboard and then hunting for the row again. Tickets now open a
 * read-only detail modal in place; the other kinds still navigate, because an
 * overdue invoice or an expiring lease is something you go and act on.
 */

type Item = {
  id: string;
  type: "TICKET" | "OVERDUE" | "LEASE_EXPIRY";
  title: string;
  subtitle: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  href: string;
  timestamp: Date | string;
};

const BADGE: Record<Item["type"], string> = {
  TICKET: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  OVERDUE: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  LEASE_EXPIRY: "border-sky-500/40 bg-sky-500/15 text-sky-300",
};

const LABEL: Record<Item["type"], string> = {
  TICKET: "Ticket",
  OVERDUE: "Overdue",
  LEASE_EXPIRY: "Lease",
};

function Body({ item }: { item: Item }) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${BADGE[item.type]}`}
        >
          {LABEL[item.type]}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-on-surface-variant">
          {new Date(item.timestamp).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kuala_Lumpur",
          })}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug text-white">{item.title}</p>
      <p className="mt-0.5 text-xs text-on-surface-variant">{item.subtitle}</p>
    </>
  );
}

export default function UrgentActionList({ items }: { items: Item[] }) {
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) =>
          item.type === "TICKET" ? (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenTicketId(item.id)}
              className="pressable rounded-xl border border-outline-variant/50 bg-surface-container-high/40 p-3 text-left transition-colors hover:border-primary/40"
            >
              <Body item={item} />
              <span className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-primary">
                View
                <span className="material-symbols-outlined text-[14px] leading-none">
                  open_in_full
                </span>
              </span>
            </button>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className="pressable rounded-xl border border-outline-variant/50 bg-surface-container-high/40 p-3 transition-colors hover:border-primary/40"
            >
              <Body item={item} />
              <span className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-primary">
                Open
                <span className="material-symbols-outlined text-[14px] leading-none">
                  arrow_forward
                </span>
              </span>
            </Link>
          )
        )}
      </div>

      {openTicketId && (
        <TicketDetailModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />
      )}
    </>
  );
}
