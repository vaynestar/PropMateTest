"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificationItem } from "@/lib/notifications";
import ScrollHint from "@/components/ui/ScrollHint";
import { dayMonth } from "@/lib/short-date";

type Portal = "admin" | "resident";

interface NotificationCenterProps {
  initialNotifications: NotificationItem[];
  portal?: Portal;
}

/*
 * One bell for both portals. The resident header used to carry a bell-shaped
 * button with no handler at all; it now opens this, fed by
 * getResidentNotifications().
 */
const COPY: Record<
  Portal,
  {
    title: string;
    empty: string;
    footer: { href: string; label: string };
    filters: { id: string; label: string }[];
  }
> = {
  admin: {
    title: "Operational Alerts",
    empty: "No operational alerts for this filter",
    footer: { href: "/admin", label: "View Command Center Pulse" },
    filters: [
      { id: "ALL", label: "All" },
      { id: "URGENT", label: "Urgent" },
      { id: "TICKET", label: "Tickets" },
      { id: "VISITOR", label: "Visitors" },
      { id: "BILLING", label: "Billing" },
    ],
  },
  /*
   * The resident gets two tabs, not seven category pills (DEV-242).
   *
   * The pills were a map of the system - BILLING, TICKET, BOOKING, NOTICE,
   * VISITOR - and a resident does not arrive at a bell thinking "show me
   * BOOKING notifications". They arrive thinking "is there anything I have to
   * do?", and occasionally "what did I miss?". Those are the two tabs. The
   * category is still on every row as a chip, so nothing is hidden behind a
   * filter that was only ever there to re-find it.
   */
  resident: {
    title: "Updates",
    empty: "Nothing new here",
    footer: { href: "/resident", label: "Back to home" },
    filters: [
      { id: "URGENT", label: "Needs you" },
      { id: "ALL", label: "All" },
    ],
  },
};

/**
 * "14:05" today, "19 Nov" before that.
 *
 * Every row printed a bare HH:MM, so a notice from last week read "09:03" and
 * looked like it had just arrived - the one thing a timestamp exists to rule
 * out.
 */
function whenLabel(ts: Date | string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const fmt = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(x);
  if (fmt(d) === fmt(new Date())) {
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kuala_Lumpur",
    });
  }
  return dayMonth(d);
}

/** The word for a row's category, so dropping the filters loses nothing. */
const TYPE_LABEL: Record<string, string> = {
  TICKET: "Repair",
  VISITOR: "Visitor",
  BILLING: "Bill",
  BOOKING: "Booking",
  NOTICE: "Notice",
  SYSTEM: "System",
};

export default function NotificationCenter({
  initialNotifications,
  portal = "admin",
}: NotificationCenterProps) {
  const copy = COPY[portal];
  const storageKey = `propmate:notif-read:${portal}`;
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState<NotificationItem[]>(initialNotifications);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  /*
   * Open on whichever tab has something to say. A resident with two overdue
   * bills should see them, not a chronological mixture they have to sift;
   * one with nothing outstanding should not land on an empty tab.
   */
  const needsYouCount = initialNotifications.filter(
    (n) => n.urgency === "CRITICAL" || n.urgency === "HIGH"
  ).length;
  const [filterType, setFilterType] = useState<string>(
    portal === "resident" && needsYouCount > 0 ? "URGENT" : "ALL"
  );

  /*
   * Read state lived in component state only, so every navigation or reload
   * brought every notification back as unread and "Mark all read" undid itself
   * within a click. Kept per device in localStorage - the ids are stable because
   * the feeds are derived from records. Loaded after mount so the server render
   * and the first client render agree.
   */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) setReadIds(new Set(saved));
    } catch {
      /* storage blocked or corrupt: start with nothing read */
    }
  }, [storageKey]);

  const persist = (next: Set<string>) => {
    setReadIds(next);
    try {
      // Only ids still in the feed, so the list cannot grow forever.
      const live = new Set(notifications.map((n) => n.id));
      localStorage.setItem(storageKey, JSON.stringify([...next].filter((id) => live.has(id))));
    } catch {
      /* ignore */
    }
  };

  /*
   * Close on a click anywhere outside. This used a `fixed inset-0` overlay, but
   * the bell sits in a backdrop-blurred header and backdrop-filter makes a
   * containing block for fixed descendants (DEV-159) - the "full-screen"
   * overlay was only as big as the 64px header, so clicking the page below
   * left the popover open.
   */
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead && !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    persist(new Set(notifications.map((n) => n.id)));
  };

  const handleItemClick = (id: string) => {
    persist(new Set([...Array.from(readIds), id]));
    setIsOpen(false);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "ALL") return true;
    if (filterType === "URGENT") return n.urgency === "CRITICAL" || n.urgency === "HIGH";
    return n.type === filterType;
  });

  return (
    <div ref={rootRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-11 w-11 items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-variant rounded-full transition-all"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <>
          <div className="absolute right-0 top-12 z-50 max-h-[70dvh] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl bg-surface-container border border-outline-variant/80 shadow-2xl sm:w-96 animate-in fade-in slide-in-from-top-2">
            {/* Popover Header */}
            <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
                <span className="text-sm font-bold text-white">{copy.title}</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold font-mono">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="-my-2 -mr-2 flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="flex h-9 items-center rounded-lg px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-white"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Two tabs for the resident, the operator's category pills for admin. */}
            {portal === "resident" ? (
              <div className="grid grid-cols-2 gap-1.5 border-b border-outline-variant/30 bg-surface-container-low p-2">
                {copy.filters.map((f) => {
                  const count = f.id === "URGENT" ? needsYouCount : notifications.length;
                  const active = filterType === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilterType(f.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all pressable ${
                        active ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-white"
                      }`}
                    >
                      {f.label}
                      <span
                        className={`rounded-full px-1.5 text-[10px] ${
                          active
                            ? "bg-black/20"
                            : f.id === "URGENT" && count > 0
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-surface-container-highest"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ScrollHint className="border-b border-outline-variant/30 bg-surface-container-low px-3 py-2 text-[11px]"><div className="flex items-center gap-1.5">
                {copy.filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterType(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                      filterType === f.id
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div></ScrollHint>
            )}

            {/* Notification Item List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant/30">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => {
                  const isRead = notif.isRead || readIds.has(notif.id);
                  const iconName =
                    notif.type === "TICKET"
                      ? "build"
                      : notif.type === "VISITOR"
                      ? "badge"
                      : notif.type === "BILLING"
                      ? "receipt_long"
                      : notif.type === "BOOKING"
                      ? "event_available"
                      : notif.type === "NOTICE"
                      ? "campaign"
                      : "info";

                  const iconColor =
                    notif.urgency === "CRITICAL"
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : notif.urgency === "HIGH"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-primary bg-primary/10 border-primary/20";

                  return (
                    /*
                     * Read and unread were a 5%-opacity tint apart and a 2px
                     * dot (user: "the contra of read and unread message colour
                     * can be more significant"). Unread now carries a solid
                     * left bar, a tint you can actually see and a white title;
                     * read drops all three and dims. You can tell them apart
                     * from across the room, which is the entire job.
                     */
                    <Link
                      key={notif.id}
                      href={notif.href}
                      onClick={() => handleItemClick(notif.id)}
                      className={`relative flex items-start gap-3 py-3.5 pl-4 pr-3.5 transition-colors ${
                        isRead
                          ? "bg-transparent hover:bg-surface-container-high"
                          : "bg-primary/12 hover:bg-primary/20"
                      }`}
                    >
                      {!isRead && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconColor} ${
                          isRead ? "opacity-55" : ""
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`truncate text-xs ${
                              isRead ? "font-medium text-on-surface-variant" : "font-bold text-white"
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <span className="shrink-0 text-[10px] font-medium text-on-surface-variant/70">
                            {whenLabel(notif.timestamp)}
                          </span>
                        </div>
                        <p className={`mt-0.5 line-clamp-2 text-[11px] ${isRead ? "text-on-surface-variant/70" : "text-on-surface-variant"}`}>
                          {notif.message}
                        </p>
                        {/* The category, on the row. The filters used to be
                            the only way to see it. */}
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-outline-variant/50 bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                          {TYPE_LABEL[notif.type] ?? notif.type}
                        </span>
                      </div>
                      {!isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
                  <span className="material-symbols-outlined text-[24px] opacity-40">
                    {filterType === "URGENT" && portal === "resident" ? "task_alt" : "notifications_paused"}
                  </span>
                  <span>
                    {filterType === "URGENT" && portal === "resident"
                      ? "Nothing needs you right now."
                      : copy.empty}
                  </span>
                </div>
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-2.5 border-t border-outline-variant/30 bg-surface-container-high/50 text-center">
              <Link
                href={copy.footer.href}
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>{copy.footer.label}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
