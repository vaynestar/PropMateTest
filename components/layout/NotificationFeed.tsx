"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NotificationItem } from "@/lib/notifications";
import ScrollHint from "@/components/ui/ScrollHint";
import {
  TYPE_ICON,
  TYPE_LABEL,
  needsAction,
  urgencyClasses,
  useReadNotifications,
  whenLabel,
} from "@/lib/notification-read";

const CATEGORIES = [
  { id: "ALL", label: "All", icon: "inbox" },
  { id: "URGENT", label: "Needs you", icon: "priority_high" },
  { id: "BILLING", label: "Bills", icon: "receipt_long" },
  { id: "TICKET", label: "Repairs", icon: "build" },
  { id: "BOOKING", label: "Bookings", icon: "event_available" },
  { id: "NOTICE", label: "Notices", icon: "campaign" },
  { id: "VISITOR", label: "Visitors", icon: "badge" },
];

/**
 * Everything the resident has been told, on a page of its own (DEV-244).
 *
 * The bell's footer used to say "Back to home", and home shows a couple of
 * recent items at most — so there was no way to reach an update once it had
 * scrolled out of a 320px popover (user, 2026-11-21: "home does not have all
 * the notification").
 *
 * The categories live HERE rather than in the bell. DEV-242 took them out of
 * the popover because a bell is for "is there anything I have to do?"; a page
 * you opened deliberately is exactly where "show me only the bills" belongs.
 */
export default function NotificationFeed({ items }: { items: NotificationItem[] }) {
  const { isRead, markRead, markAllRead, unreadCount } = useReadNotifications("resident", items);
  const [filter, setFilter] = useState("ALL");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: items.length, URGENT: items.filter(needsAction).length };
    for (const c of CATEGORIES) {
      if (c.id === "ALL" || c.id === "URGENT") continue;
      out[c.id] = items.filter((n) => n.type === c.id).length;
    }
    return out;
  }, [items]);

  const shown = items.filter((n) => {
    if (onlyUnread && isRead(n)) return false;
    if (filter === "ALL") return true;
    if (filter === "URGENT") return needsAction(n);
    return n.type === filter;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-on-surface-variant">
          {unreadCount > 0 ? (
            <>
              <span className="font-bold text-on-surface">{unreadCount}</span> unread of {items.length}
            </>
          ) : (
            <>All {items.length} read</>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyUnread((v) => !v)}
            aria-pressed={onlyUnread}
            className={`pressable rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              onlyUnread
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-outline-variant/60 bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Unread only
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-variant"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <ScrollHint className="pb-1">
        <div className="flex items-center gap-1.5">
          {CATEGORIES.map((c) => {
            const active = filter === c.id;
            const n = counts[c.id] ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={`pressable inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-on-primary font-bold shadow-md"
                    : "border border-outline-variant/40 bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{c.icon}</span>
                {c.label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-black/20" : "bg-surface-container-highest"}`}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollHint>

      {shown.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 rounded-2xl p-10 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] opacity-50">
            {onlyUnread || filter === "URGENT" ? "task_alt" : "notifications_paused"}
          </span>
          <p className="text-sm">
            {onlyUnread
              ? "Nothing unread here."
              : filter === "URGENT"
              ? "Nothing needs you right now."
              : "Nothing in this category yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container">
          {shown.map((n) => {
            const read = isRead(n);
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => markRead(n.id)}
                  className={`relative flex items-start gap-3 py-4 pl-4 pr-4 transition-colors ${
                    read ? "bg-transparent hover:bg-surface-container-high" : "bg-primary/12 hover:bg-primary/20"
                  }`}
                >
                  {!read && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${urgencyClasses(
                      n.urgency
                    )} ${read ? "opacity-55" : ""}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{TYPE_ICON[n.type] ?? "info"}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-sm ${read ? "font-medium text-on-surface-variant" : "font-bold text-white"}`}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-on-surface-variant/70">
                        {whenLabel(n.timestamp)}
                      </span>
                    </span>
                    <span className={`mt-0.5 block text-xs ${read ? "text-on-surface-variant/70" : "text-on-surface-variant"}`}>
                      {n.message}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1.5">
                      <span className="rounded-full border border-outline-variant/50 bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {needsAction(n) && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          Needs you
                        </span>
                      )}
                    </span>
                  </span>
                  {!read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
