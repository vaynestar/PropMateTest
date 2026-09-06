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

  const [filterLocationType, setFilterLocationType] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const filteredTickets = tickets.filter((t) => {
    const propId = t.property_id || t.lease?.unit?.property_id || t.unit?.property_id;
    const matchesProperty =
      true;

    const isCommonArea = t.location_type === "Common Area";
    const matchesLocationType =
      filterLocationType === "ALL"
        ? true
        : filterLocationType === "COMMON"
        ? isCommonArea
        : !isCommonArea;

    const matchesPriority = filterPriority ? t.priority === filterPriority : true;
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    const searchLower = search.toLowerCase().trim();
    const unitNumber = t.unit?.unit_number || t.lease?.unit?.unit_number || "";
    const matchesSearch =
      !searchLower ||
      t.title.toLowerCase().includes(searchLower) ||
      unitNumber.toLowerCase().includes(searchLower) ||
      (t.location_detail && t.location_detail.toLowerCase().includes(searchLower)) ||
      t.ticket_category?.toLowerCase().includes(searchLower) ||
      t.ticket_id?.toLowerCase().includes(searchLower);

    return matchesProperty && matchesLocationType && matchesPriority && matchesStatus && matchesSearch;
  });

  const formatDate = (date: Date | string) => {
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
        setToast({ message: "Ticket updated.", type: "success" });
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
        {/* Search and Filters Bar */}
        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full max-w-md relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by title, category, location, or unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none transition-colors placeholder:text-on-surface-variant/60"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-3 lg:w-auto">
            {/* Location Type Filter */}
            <select
              value={filterLocationType}
              onChange={(e) => setFilterLocationType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none font-medium"
            >
              <option value="ALL">Units and common areas</option>
              <option value="UNIT">Inside a unit</option>
              <option value="COMMON">Common areas</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none font-medium"
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

        {/* Results count & reset */}
        <div className="px-5 py-2 bg-surface-container/30 border-b border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
          <span>
            Showing <span className="font-semibold text-on-surface">{filteredTickets.length}</span> of {tickets.length} tickets in this property
          </span>
          {(search || filterLocationType !== "ALL" || filterPriority || filterStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterLocationType("ALL");
                setFilterPriority("");
                setFilterStatus("");
              }}
              className="text-primary hover:underline font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant">
              <tr>
                <th className="px-5 py-3 font-medium">Ticket ID</th>
                <th className="px-5 py-3 font-medium">Location & Property</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Title & Remark</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
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
                  const isCommonArea = t.location_type === "Common Area";
                  const unitNum = t.unit?.unit_number || t.lease?.unit?.unit_number;
                  const propertyName =
                    t.property?.property_name ||
                    t.lease?.unit?.property?.property_name ||
                    t.unit?.property?.property_name ||
                    "—";

                  return (
                    <tr key={t.ticket_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-on-surface-variant font-semibold">
                        #{t.ticket_id.split("-")[0].toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5">
                        {isCommonArea ? (
                          <div>
                            <div className="flex items-center gap-1 text-cyan-300 font-semibold text-xs">
                              <span className="material-symbols-outlined text-[15px]">domain</span>
                              <span>{t.location_detail || "Common Area"}</span>
                            </div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">
                              {propertyName}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-on-surface text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-primary">meeting_room</span>
                              <span>Unit {unitNum || "N/A"}</span>
                            </div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5">
                              {propertyName}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-xs text-primary">
                        {t.ticket_category}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-[220px] truncate font-medium text-on-surface text-xs" title={t.title}>
                          {t.title}
                        </div>
                        {t.remark ? (
                          <div className="max-w-[220px] truncate text-[11px] text-amber-300 flex items-center gap-1 mt-0.5" title={t.remark}>
                            <span className="material-symbols-outlined text-[13px]">sticky_note_2</span>
                            <span>{t.remark}</span>
                          </div>
                        ) : t.description ? (
                          <div className="max-w-[220px] truncate text-[11px] text-on-surface-variant mt-0.5" title={t.description}>
                            {t.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          t.priority === 'Urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 
                          t.priority === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          t.priority === 'Medium' ? 'bg-primary/20 text-primary border border-primary/40' :
                          'bg-surface-variant text-on-surface-variant border border-outline-variant'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-on-surface-variant font-mono">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingTicket(t)}
                          className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors text-xs pressable"
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

      {/* Manage / Update Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg overflow-hidden border border-outline-variant shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">edit_document</span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Manage Ticket</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant font-semibold">
                  #{editingTicket.ticket_id.split("-")[0].toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTicket(null);
                  setToast(null);
                }}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
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

              {/* Location Badge Header */}
              <div className="p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant/30 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-on-surface text-sm">{editingTicket.title}</div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">
                    {editingTicket.ticket_category}
                  </span>
                </div>
                <div className="text-xs font-medium text-cyan-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">
                    {editingTicket.location_type === "Common Area" ? "domain" : "meeting_room"}
                  </span>
                  <span>
                    {editingTicket.location_type === "Common Area"
                      ? `Common Area: ${editingTicket.location_detail || "General"}`
                      : `Unit ${editingTicket.unit?.unit_number || editingTicket.lease?.unit?.unit_number || "N/A"}`}
                  </span>
                </div>
                <div className="text-on-surface-variant line-clamp-3 pt-1 border-t border-outline-variant/20">
                  {editingTicket.description}
                </div>
              </div>

              {/* Status Dropdown with KIV Option */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">Status</label>
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
                <label className="text-xs font-medium text-on-surface-variant">Assigned to</label>
                <select
                  name="assigned_to"
                  defaultValue={editingTicket.assigned_to || ""}
                  className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary text-sm"
                >
                  <option value="">Unassigned</option>
                  {admins?.map((admin) => (
                    <option key={admin.user_id} value={admin.user_id}>
                      {admin.user_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Maintenance Cost */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">
                  What it cost (RM)
                </label>
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
                  <span>What was done</span>
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
