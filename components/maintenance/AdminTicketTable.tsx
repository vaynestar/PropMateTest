"use client";

import { useState, useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateTicketAction } from "@/app/admin/maintenance/actions";

type PropertyItem = {
  property_id: string;
  property_name: string;
};

type AdminTicketTableProps = {
  tickets: any[];
  admins: any[];
  properties?: PropertyItem[];
  defaultPropertyId?: string;
};

export default function AdminTicketTable({
  tickets,
  admins,
  properties = [],
  defaultPropertyId = "",
}: AdminTicketTableProps) {
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState(
    defaultPropertyId && properties.some((p) => p.property_id === defaultPropertyId)
      ? defaultPropertyId
      : "ALL"
  );
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const filteredTickets = tickets.filter((t) => {
    const matchesProperty =
      filterProperty === "ALL" || !filterProperty
        ? true
        : t.lease?.unit?.property_id === filterProperty;
    const matchesPriority = filterPriority ? t.priority === filterPriority : true;
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(searchLower) ||
      t.lease?.unit?.unit_number?.toLowerCase().includes(searchLower) ||
      t.ticket_category?.toLowerCase().includes(searchLower);

    return matchesProperty && matchesPriority && matchesStatus && matchesSearch;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateTicketAction(formData);
      if (res?.error) {
        setToast({ message: res.error, type: "error" });
      } else {
        setToast({ message: "Ticket updated successfully!", type: "success" });
        setTimeout(() => {
          setEditingTicket(null);
          setToast(null);
        }, 600);
      }
    });
  };

  return (
    <>
      <div className="glass-card rounded-xl p-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full max-w-md relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by title, category, or unit number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none transition-colors"
            />
          </div>
          <div className="flex flex-wrap w-full lg:w-auto gap-2">
            {/* Property Filter */}
            {properties.length > 0 && (
              <select
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="flex-1 lg:w-auto px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none font-medium"
              >
                <option value="ALL">📋 All Properties</option>
                {properties.map((p) => (
                  <option key={p.property_id} value={p.property_id}>
                    🏢 {p.property_name} {p.property_id === defaultPropertyId ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="flex-1 lg:w-auto px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none"
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
              className="flex-1 lg:w-auto px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Parts">Pending Parts</option>
              <option value="KIV">KIV (Keep In View)</option>
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
                <th className="px-6 py-3 font-medium">Unit & Property</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Title & Remark</th>
                <th className="px-6 py-3 font-medium">Priority</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">
                    No tickets found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  return (
                    <tr key={t.ticket_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                        #{t.ticket_id.split("-")[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-on-surface">
                          {t.lease?.unit?.unit_number}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {t.lease?.unit?.property?.property_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-xs text-primary">
                        {t.ticket_category}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[220px] truncate font-medium text-on-surface" title={t.title}>
                          {t.title}
                        </div>
                        {t.remark ? (
                          <div className="max-w-[220px] truncate text-[11px] text-amber-300 flex items-center gap-1" title={t.remark}>
                            <span className="material-symbols-outlined text-[13px]">sticky_note_2</span>
                            <span>{t.remark}</span>
                          </div>
                        ) : t.description ? (
                          <div className="max-w-[220px] truncate text-[11px] text-on-surface-variant" title={t.description}>
                            {t.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                          t.priority === 'Urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 
                          t.priority === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          t.priority === 'Medium' ? 'bg-primary/20 text-primary border border-primary/40' :
                          'bg-surface-variant text-on-surface-variant border border-outline-variant'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={t.status} variant="ticket" />
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs font-mono">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTicket(t);
                            setToast(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-semibold text-primary hover:bg-surface-variant transition-colors pressable"
                        >
                          Manage
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

      {/* Edit / Manage Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-outline-variant/40 animate-slide-up">
            <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-bold">
                  Manage Helpdesk Ticket
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  #{editingTicket.ticket_id.split("-")[0].toUpperCase()} · {editingTicket.lease?.unit?.unit_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTicket(null);
                  setToast(null);
                }}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 flex flex-col gap-4">
              {toast && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                    toast.type === "success"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {toast.type === "success" ? "check_circle" : "error"}
                  </span>
                  <span>{toast.message}</span>
                </div>
              )}

              <input type="hidden" name="ticket_id" value={editingTicket.ticket_id} />

              <div className="p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant/30 text-xs space-y-1">
                <div className="font-semibold text-on-surface">{editingTicket.title}</div>
                <div className="text-on-surface-variant line-clamp-2">{editingTicket.description}</div>
              </div>

              {/* Status Dropdown with KIV Option */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">Ticket Status</label>
                <select
                  name="status"
                  defaultValue={editingTicket.status}
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Parts">Pending Parts</option>
                  <option value="KIV">KIV (Keep In View)</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Assignee */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">Assignee (Staff / Admin)</label>
                <select
                  name="assigned_to"
                  defaultValue={editingTicket.assigned_to || ""}
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary text-sm"
                >
                  <option value="">Unassigned</option>
                  {admins?.map((admin) => (
                    <option key={admin.user_id} value={admin.user_id}>
                      👤 {admin.user_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Maintenance Cost */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">Maintenance Cost (RM)</label>
                <input
                  type="number"
                  name="cost"
                  step="0.01"
                  min="0"
                  defaultValue={editingTicket.cost ? Number(editingTicket.cost) : ""}
                  placeholder="0.00"
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary text-sm font-mono"
                />
              </div>

              {/* Optional Remark / Admin Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant flex items-center justify-between">
                  <span>Remark / Admin Notes</span>
                  <span className="text-[10px] text-on-surface-variant font-normal">(Optional)</span>
                </label>
                <textarea
                  name="remark"
                  defaultValue={editingTicket.remark || ""}
                  placeholder="Internal admin notes, parts status, or resolution remarks..."
                  rows={2}
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary text-xs resize-none placeholder:text-on-surface-variant/60"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTicket(null);
                    setToast(null);
                  }}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg font-medium text-xs text-on-surface-variant hover:bg-surface-variant transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all pressable disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPending ? (
                    <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                  {isPending ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
