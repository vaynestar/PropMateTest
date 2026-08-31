"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";

type Ticket = {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  created_at: Date;
  ticket_category: string;
};

type Props = {
  tickets: Ticket[];
};

export default function FilterableTicketQueue({ tickets }: Props) {
  const [filter, setFilter] = useState<string>("All");

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === "All") return true;
    if (filter === "Urgent/High") return ticket.priority === "Urgent" || ticket.priority === "High";
    return ticket.priority.toLowerCase() === filter.toLowerCase();
  });

  const getRelativeTime = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Priority Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar text-xs">
        {["All", "Urgent/High", "Normal", "Low"].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFilter(level)}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 ${
              filter === level
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-container-high text-on-surface-variant hover:text-white"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Ticket List */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <Link
              key={ticket.ticket_id}
              href="/admin/maintenance"
              className="p-3.5 rounded-xl bg-surface-container-lowest/90 border border-outline-variant/40 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 group block"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-white group-hover:text-primary transition-colors truncate">
                  {ticket.title}
                </span>
                <span className="text-[11px] text-on-surface-variant flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-[10px] text-on-surface font-medium">
                    {ticket.ticket_category || "General"}
                  </span>
                  <span>•</span>
                  <span>{getRelativeTime(new Date(ticket.created_at))}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    ticket.priority === "Urgent"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : ticket.priority === "High"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : ticket.priority === "Normal"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-surface-container-high text-on-surface-variant border border-outline-variant/40"
                  }`}
                >
                  {ticket.priority}
                </span>
                <StatusBadge status={ticket.status} />
              </div>
            </Link>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
            <span className="material-symbols-outlined text-2xl text-emerald-400">check_circle</span>
            <span>No {filter !== "All" ? filter : ""} active tickets in queue.</span>
          </div>
        )}
      </div>
    </div>
  );
}
