"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "@/lib/notifications";

/**
 * Which notifications this device has already read.
 *
 * Kept in localStorage, per portal. The ids are stable because every feed
 * item is derived from a record, so the same overdue bill keeps the same id
 * between loads. Read after mount, so the server render and the first client
 * render agree.
 *
 * Shared by the bell (NotificationCenter) and the full page
 * (/resident/notifications) — before DEV-244 the bell owned this privately,
 * and a second surface would have had its own idea of what you had read.
 */
export function useReadNotifications(portal: "admin" | "resident", items: NotificationItem[]) {
  const storageKey = `propmate:notif-read:${portal}`;
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) setReadIds(new Set(saved));
    } catch {
      /* storage blocked or corrupt: start with nothing read */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      setReadIds(next);
      try {
        // Only ids still in the feed, so the list cannot grow forever.
        const live = new Set(items.map((n) => n.id));
        localStorage.setItem(storageKey, JSON.stringify([...next].filter((id) => live.has(id))));
      } catch {
        /* ignore */
      }
    },
    [items, storageKey]
  );

  const isRead = useCallback(
    (n: NotificationItem) => n.isRead || readIds.has(n.id),
    [readIds]
  );

  const markRead = useCallback(
    (id: string) => persist(new Set([...Array.from(readIds), id])),
    [persist, readIds]
  );

  const markAllRead = useCallback(
    () => persist(new Set(items.map((n) => n.id))),
    [items, persist]
  );

  return { isRead, markRead, markAllRead, unreadCount: items.filter((n) => !isRead(n)).length };
}

/** The word for a row's category, so a surface without filters loses nothing. */
export const TYPE_LABEL: Record<string, string> = {
  TICKET: "Repair",
  VISITOR: "Visitor",
  BILLING: "Bill",
  BOOKING: "Booking",
  NOTICE: "Notice",
  SYSTEM: "System",
};

export const TYPE_ICON: Record<string, string> = {
  TICKET: "build",
  VISITOR: "badge",
  BILLING: "receipt_long",
  BOOKING: "event_available",
  NOTICE: "campaign",
  SYSTEM: "info",
};

export function urgencyClasses(urgency?: string) {
  return urgency === "CRITICAL"
    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
    : urgency === "HIGH"
    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-primary bg-primary/10 border-primary/20";
}

export function needsAction(n: NotificationItem) {
  return n.urgency === "CRITICAL" || n.urgency === "HIGH";
}

/**
 * "14:05" today, "19 Nov" before that.
 *
 * Every row printed a bare HH:MM, so a notice from last week read "09:03" and
 * looked like it had just arrived — the one thing a timestamp exists to rule
 * out (DEV-242).
 */
export function whenLabel(ts: Date | string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const fmt = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(x);
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  });
  if (fmt(d) === fmt(new Date())) return time;
  const [y, m, day] = fmt(d).split("-").map(Number);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]}`;
}
