"use client";

import { useState } from "react";
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
  const [filter, setFilter] = useState<"All" | "High" | "Medium" | "Low">("All");

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === "All") return true;
    return ticket.priority === filter;
  });

  // Helper for relative time (e.g., "2 hours ago")
  const getRelativeTime = (date: Date) => {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diffMs = date.getTime() - new Date().getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) return "Just now";
      return rtf.format(diffHours, "hour");
    }
    return rtf.format(diffDays, "day");
  };

  return (
    <div className="glass-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-title-md font-semibold text-primary-900 dark:text-primary-100">
          All Open Tickets
        </h3>
        
        {/* Filter Dropdown/Tabs */}
        <div className="flex items-center gap-2">
          {["All", "High", "Medium", "Low"].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level as any)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === level
                  ? "bg-primary-900 text-white dark:bg-primary-100 dark:text-primary-900 font-medium"
                  : "bg-surface-200 text-primary-600 hover:bg-surface-300 dark:bg-surface-800 dark:text-primary-300"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.ticket_id}
              className="flex items-start justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-800 hover:border-primary-200 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
                  {ticket.title}
                </span>
                <span className="text-xs text-primary-500">
                  {ticket.ticket_category} • {getRelativeTime(new Date(ticket.created_at))}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                {ticket.priority === "High" || ticket.priority === "Urgent" ? (
                  <span className="bg-error/10 text-error border border-error/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">{ticket.priority}</span>
                ) : ticket.priority === "Medium" ? (
                  <span className="bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">Med</span>
                ) : (
                  <span className="bg-surface-variant text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">Low</span>
                )}
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-primary-500 text-sm">
            <svg
              className="w-12 h-12 mb-2 text-surface-300 dark:text-surface-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            No {filter !== "All" ? filter : ""} open tickets
          </div>
        )}
      </div>
    </div>
  );
}
