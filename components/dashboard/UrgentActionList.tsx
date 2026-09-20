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

const ROW =
  "pressable flex w-full items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-high/40 p-3 text-left transition-colors hover:border-primary/40";

function Body({ item, cta }: { item: Item; cta: string }) {
  return (
    <>
      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${BADGE[item.type]}`}>
        {LABEL[item.type]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-snug text-white">{item.title}</span>
        <span className="block truncate text-xs text-on-surface-variant">{item.subtitle}</span>
      </span>
      <span className="hidden shrink-0 text-[11px] tabular-nums text-on-surface-variant sm:block">
        {new Date(item.timestamp).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          timeZone: "Asia/Kuala_Lumpur",
        })}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
        <span className="hidden sm:inline">{cta}</span>
        <span className="material-symbols-outlined text-[16px] leading-none">chevron_right</span>
      </span>
    </>
  );
}

export default function UrgentActionList({ items }: { items: Item[] }) {
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((item) =>
          item.type === "TICKET" ? (
            <button key={item.id} type="button" onClick={() => setOpenTicketId(item.id)} className={ROW}>
              <Body item={item} cta="View" />
            </button>
          ) : (
            <Link key={item.id} href={item.href} className={ROW}>
              <Body item={item} cta="Open" />
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
