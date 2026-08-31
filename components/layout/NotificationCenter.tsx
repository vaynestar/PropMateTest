"use client";

import { useState } from "react";
import Link from "next/link";
import { NotificationItem } from "@/lib/notifications";

interface NotificationCenterProps {
  initialNotifications: NotificationItem[];
}

export default function NotificationCenter({ initialNotifications }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("ALL");

  const unreadCount = notifications.filter((n) => !n.isRead && !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const handleItemClick = (id: string) => {
    setReadIds((prev) => new Set([...Array.from(prev), id]));
    setIsOpen(false);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "ALL") return true;
    if (filterType === "URGENT") return n.urgency === "CRITICAL" || n.urgency === "HIGH";
    return n.type === filterType;
  });

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-on-surface-variant hover:text-white hover:bg-surface-variant rounded-full p-2 transition-all"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-surface animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl bg-surface-container border border-outline-variant/80 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            {/* Popover Header */}
            <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">notifications_active</span>
                <span className="text-sm font-bold text-white">Operational Alerts</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold font-mono">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="px-3 py-2 border-b border-outline-variant/30 flex items-center gap-1.5 overflow-x-auto text-[11px] hide-scrollbar bg-surface-container-low">
              {[
                { id: "ALL", label: "All" },
                { id: "URGENT", label: "Urgent" },
                { id: "TICKET", label: "Tickets" },
                { id: "VISITOR", label: "Visitors" },
                { id: "BILLING", label: "Billing" },
              ].map((f) => (
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
            </div>

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
                      : "info";

                  const iconColor =
                    notif.urgency === "CRITICAL"
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : notif.urgency === "HIGH"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-primary bg-primary/10 border-primary/20";

                  return (
                    <Link
                      key={notif.id}
                      href={notif.href}
                      onClick={() => handleItemClick(notif.id)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-surface-container-high transition-colors group ${
                        !isRead ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconColor}`}>
                        <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-semibold truncate ${!isRead ? "text-white" : "text-on-surface-variant"}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-on-surface-variant/70 shrink-0 font-mono">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
                  <span className="material-symbols-outlined text-[24px] opacity-40">notifications_paused</span>
                  <span>No operational alerts for this filter</span>
                </div>
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-2.5 border-t border-outline-variant/30 bg-surface-container-high/50 text-center">
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>View Command Center Pulse</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
