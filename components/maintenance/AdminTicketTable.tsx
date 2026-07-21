"use client";

import { useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateStatusAction } from "@/app/admin/maintenance/actions";

const NEXT_STATUSES: Record<string, string> = {
  Open: "In Progress",
  "In Progress": "Resolved",
  Resolved: "Closed",
};

export default function AdminTicketTable({ tickets }: { tickets: any[] }) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filteredTickets = tickets.filter((t) => {
    const matchesPriority = filterPriority ? t.priority === filterPriority : true;
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(searchLower) ||
      t.lease.unit.unit_number.toLowerCase().includes(searchLower);

    return matchesPriority && matchesStatus && matchesSearch;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="glass-card rounded-xl p-0 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full max-w-md relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by title or unit number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none transition-colors"
          />
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="flex-1 md:w-auto px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 md:w-auto px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant">
            <tr>
              <th className="px-6 py-3 font-medium">Ticket ID</th>
              <th className="px-6 py-3 font-medium">Unit</th>
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Priority</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">
                  No tickets found matching your filters.
                </td>
              </tr>
            ) : (
              filteredTickets.map((t) => {
                const next = NEXT_STATUSES[t.status];
                return (
                  <tr key={t.ticket_id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                      {t.ticket_id.split("-")[0].toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {t.lease.unit.unit_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px] truncate" title={t.title}>
                        {t.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        t.priority === 'Urgent' ? 'bg-error-container text-error-container' : 
                        t.priority === 'High' ? 'bg-orange-500/20 text-orange-500' :
                        t.priority === 'Medium' ? 'bg-primary-container text-on-primary-container' :
                        'bg-surface-variant text-on-surface-variant'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.status} variant="ticket" />
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {next ? (
                        <form action={updateStatusAction}>
                          <input type="hidden" name="ticket_id" value={t.ticket_id} />
                          <input type="hidden" name="status" value={next} />
                          <button
                            type="submit"
                            className="font-medium text-primary hover:text-primary-container transition-colors"
                          >
                            Mark {next}
                          </button>
                        </form>
                      ) : (
                        <span className="text-on-surface-variant italic">Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
