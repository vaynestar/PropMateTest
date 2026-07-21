"use client";

import { useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateTicketAction } from "@/app/admin/maintenance/actions";

const NEXT_STATUSES: Record<string, string> = {
  Open: "In Progress",
  "In Progress": "Resolved",
  Resolved: "Closed",
};

export default function AdminTicketTable({ tickets, admins }: { tickets: any[], admins: any[] }) {
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingTicket, setEditingTicket] = useState<any>(null);

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
    <>
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
                <th className="px-6 py-3 font-medium text-right">Action</th>
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
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingTicket(t)}
                          className="font-medium text-primary hover:text-primary-container transition-colors"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container rounded-xl w-full max-w-md overflow-hidden flex flex-col shadow-lg border border-outline-variant/30">
            <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
              <h3 className="font-title-md text-title-md text-on-surface">Update Ticket</h3>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              action={(formData) => {
                updateTicketAction(formData);
                setEditingTicket(null);
              }}
              className="p-4 flex flex-col gap-4"
            >
              <input type="hidden" name="ticket_id" value={editingTicket.ticket_id} />

              <div className="flex flex-col gap-1">
                <label className="text-sm text-on-surface-variant">Status</label>
                <select
                  name="status"
                  defaultValue={editingTicket.status}
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-on-surface-variant">Assignee</label>
                <select
                  name="assigned_to"
                  defaultValue={editingTicket.assigned_to || ""}
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
                >
                  <option value="">Unassigned</option>
                  {admins?.map((admin) => (
                    <option key={admin.user_id} value={admin.user_id}>
                      {admin.user_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-on-surface-variant">Maintenance Cost (RM)</label>
                <input
                  type="number"
                  name="cost"
                  step="0.01"
                  min="0"
                  defaultValue={editingTicket.cost ? Number(editingTicket.cost) : ""}
                  placeholder="0.00"
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
