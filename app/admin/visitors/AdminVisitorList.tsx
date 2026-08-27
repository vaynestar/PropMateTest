"use client";

import { useMemo, useState, useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateVisitorStatus } from "./actions";

interface VisitorRecord {
  visitor_id: string;
  property_id?: string | null;
  lease_id?: string | null;
  visitor_type?: string | null;
  visitor_name: string;
  visitor_ic_no: string;
  contact_no?: string | null;
  vehicle_plate?: string | null;
  visit_purpose?: string | null;
  destination?: string | null;
  visit_date?: Date | string | null;
  check_in_time?: Date | string | null;
  check_out_time?: Date | string | null;
  status?: string | null;
  property?: {
    property_name: string;
  } | null;
  lease?: {
    unit: {
      unit_number: string;
      property?: {
        property_name: string;
      } | null;
    };
    tenant: {
      user_name: string;
      phone_number?: string | null;
    };
  } | null;
}

export default function AdminVisitorList({ visitors }: { visitors: VisitorRecord[] }) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const handleUpdateStatus = (visitorId: string, status: string) => {
    setUpdatingId(visitorId);
    startTransition(async () => {
      await updateVisitorStatus(visitorId, status);
      setUpdatingId(null);
    });
  };

  // KPI Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const total = visitors.length;
    const checkedIn = visitors.filter((v) => v.status === "Checked In").length;
    const pending = visitors.filter((v) => v.status === "Pending").length;
    const today = visitors.filter((v) => {
      if (!v.visit_date) return false;
      const d = new Date(v.visit_date).toISOString().split("T")[0];
      return d === todayStr;
    }).length;

    return { total, checkedIn, pending, today };
  }, [visitors]);

  // Filtered List
  const filteredVisitors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const todayStr = new Date().toISOString().split("T")[0];

    return visitors.filter((v) => {
      // 1. Text Search
      if (q) {
        const nameMatch = v.visitor_name.toLowerCase().includes(q);
        const icMatch = v.visitor_ic_no.toLowerCase().includes(q);
        const plateMatch = v.vehicle_plate?.toLowerCase().includes(q);
        const destMatch = v.destination?.toLowerCase().includes(q);
        const purposeMatch = v.visit_purpose?.toLowerCase().includes(q);
        const hostMatch = v.lease?.tenant?.user_name.toLowerCase().includes(q);
        const unitMatch = v.lease?.unit?.unit_number.toLowerCase().includes(q);

        if (!nameMatch && !icMatch && !plateMatch && !destMatch && !purposeMatch && !hostMatch && !unitMatch) {
          return false;
        }
      }

      // 2. Type Filter
      if (typeFilter !== "ALL") {
        const vType = v.visitor_type || "Resident Guest";
        if (vType !== typeFilter) return false;
      }

      // 3. Status Filter
      if (statusFilter !== "ALL") {
        if (v.status !== statusFilter) return false;
      }

      // 4. Timeframe Filter
      if (timeframeFilter !== "ALL" && v.visit_date) {
        const vDateStr = new Date(v.visit_date).toISOString().split("T")[0];
        if (timeframeFilter === "TODAY" && vDateStr !== todayStr) return false;
        if (timeframeFilter === "UPCOMING" && vDateStr < todayStr) return false;
        if (timeframeFilter === "PAST" && vDateStr >= todayStr) return false;
      }

      return true;
    });
  }, [visitors, searchQuery, typeFilter, statusFilter, timeframeFilter]);

  // Visitor Type Badge Formatter
  const getTypeBadge = (type?: string | null) => {
    const t = type || "Resident Guest";
    switch (t) {
      case "Contractor":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">construction</span>
            <span>Contractor</span>
          </span>
        );
      case "Delivery":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">local_shipping</span>
            <span>Delivery</span>
          </span>
        );
      case "Official":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">policy</span>
            <span>Official</span>
          </span>
        );
      case "General":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">badge</span>
            <span>General</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">person</span>
            <span>Resident Guest</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 4 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container border border-outline-variant/50 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-on-surface-variant font-medium">Total Registered</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.total}</span>
            <span className="material-symbols-outlined text-primary text-xl">badge</span>
          </div>
        </div>

        <div className="bg-surface-container border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-emerald-400 font-medium">Currently On-Site</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-300 tracking-tight">{stats.checkedIn}</span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">sensors</span>
          </div>
        </div>

        <div className="bg-surface-container border border-amber-500/30 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-amber-400 font-medium">Pending Approval</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-300 tracking-tight">{stats.pending}</span>
            <span className="material-symbols-outlined text-amber-400 text-xl">pending</span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant/50 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
          <span className="text-[11px] text-on-surface-variant font-medium">Today's Visits</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{stats.today}</span>
            <span className="material-symbols-outlined text-cyan-400 text-xl">today</span>
          </div>
        </div>
      </div>

      {/* MULTI-FILTER BAR & SEARCH */}
      <div className="bg-surface-container/60 border border-outline-variant/50 rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visitor name, IC, destination, host, or plate..."
            className="w-full pl-9 pr-3.5 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-white text-xs placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Classification Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-primary"
          >
            <option value="ALL">👥 All Classifications</option>
            <option value="Resident Guest">🏠 Resident Guests</option>
            <option value="Contractor">🔧 Contractors</option>
            <option value="Delivery">📦 Deliveries</option>
            <option value="Official">🏛️ Officials</option>
            <option value="General">🚶 General</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-primary"
          >
            <option value="ALL">⚡ All Statuses</option>
            <option value="Checked In">● Checked In (On Site)</option>
            <option value="Approved">🟢 Approved</option>
            <option value="Pending">⏳ Pending</option>
            <option value="Checked Out">🏁 Checked Out</option>
            <option value="Declined">❌ Declined</option>
          </select>

          {/* Timeframe */}
          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none focus:border-primary"
          >
            <option value="ALL">🗓️ All Dates</option>
            <option value="TODAY">📍 Today Only</option>
            <option value="UPCOMING">⏩ Upcoming</option>
            <option value="PAST">⏪ Past</option>
          </select>

          {/* View Mode */}
          <div className="flex bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
              title="Grid Cards View"
            >
              <span className="material-symbols-outlined text-[16px] block">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-[16px] block">table_rows</span>
            </button>
          </div>
        </div>
      </div>

      {/* VISITOR DIRECTORY LIST */}
      {filteredVisitors.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl opacity-40">badge</span>
          <p className="text-sm font-medium text-white">No visitors found matching current filters.</p>
          <p className="text-xs text-on-surface-variant">Try clearing the search query or adjusting status filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisitors.map((v) => {
            const isItemUpdating = isPending && updatingId === v.visitor_id;
            return (
              <div
                key={v.visitor_id}
                className="bg-surface-container border border-outline-variant/60 rounded-2xl p-5 shadow-lg relative flex flex-col justify-between hover:border-primary/50 transition-all gap-4"
              >
                {/* Header & Badges */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getTypeBadge(v.visitor_type)}
                        {v.property?.property_name && (
                          <span className="text-[10px] text-on-surface-variant truncate max-w-[120px]">
                            🏢 {v.property.property_name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white truncate" title={v.visitor_name}>
                        {v.visitor_name}
                      </h3>
                    </div>
                    <StatusBadge status={v.status || "Pending"} />
                  </div>

                  {/* Destination Tag */}
                  <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Destination</span>
                      {v.lease?.tenant && (
                        <span className="text-[11px] text-primary truncate max-w-[140px]" title={v.lease.tenant.user_name}>
                          Host: {v.lease.tenant.user_name}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-white truncate">
                      {v.destination || (v.lease?.unit ? `Unit ${v.lease.unit.unit_number}` : "General Property")}
                    </span>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-1.5 text-xs text-on-surface-variant border-t border-outline-variant/30 pt-3">
                  <div className="flex justify-between">
                    <span>IC / Passport:</span>
                    <span className="text-white font-mono">{v.visitor_ic_no}</span>
                  </div>

                  {v.contact_no && (
                    <div className="flex justify-between">
                      <span>Contact:</span>
                      <span className="text-white">{v.contact_no}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Visit Date:</span>
                    <span className="text-white font-medium">
                      {v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB") : "-"}
                    </span>
                  </div>

                  {v.vehicle_plate && (
                    <div className="flex justify-between items-center">
                      <span>Vehicle Plate:</span>
                      <span className="font-mono text-amber-300 font-bold bg-surface-container-high px-1.5 py-0.5 rounded text-[11px]">
                        {v.vehicle_plate}
                      </span>
                    </div>
                  )}

                  {v.check_in_time && (
                    <div className="flex justify-between text-emerald-400 font-mono text-[11px]">
                      <span>Check-in:</span>
                      <span>
                        {new Date(v.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}

                  {v.check_out_time && (
                    <div className="flex justify-between text-on-surface-variant font-mono text-[11px]">
                      <span>Check-out:</span>
                      <span>
                        {new Date(v.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}

                  {v.visit_purpose && (
                    <div className="pt-1 text-[11px] text-on-surface-variant truncate" title={v.visit_purpose}>
                      <span className="font-semibold text-on-surface">Purpose:</span> {v.visit_purpose}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-outline-variant/30 flex gap-2">
                  {v.status === "Pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Approved")}
                        disabled={isItemUpdating}
                        className="flex-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 pressable"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Declined")}
                        disabled={isItemUpdating}
                        className="flex-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 pressable"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                        <span>Decline</span>
                      </button>
                    </>
                  ) : v.status === "Approved" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Checked In")}
                        disabled={isItemUpdating}
                        className="flex-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 pressable"
                      >
                        <span className="material-symbols-outlined text-[16px]">sensors</span>
                        <span>Check In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Cancelled")}
                        disabled={isItemUpdating}
                        className="px-3 bg-surface-container-high text-on-surface-variant hover:text-white border border-outline-variant py-2 rounded-xl text-xs font-medium transition-colors pressable"
                      >
                        Cancel
                      </button>
                    </>
                  ) : v.status === "Checked In" ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(v.visitor_id, "Checked Out")}
                      disabled={isItemUpdating}
                      className="w-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 pressable"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Mark Checked Out</span>
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-on-surface-variant text-xs font-medium opacity-60">
                      {v.status === "Checked Out" ? "🏁 Visit Completed" : v.status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DENSE TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/50 bg-surface-container shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/40 text-on-surface-variant uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Visitor & Type</th>
                <th className="px-4 py-3.5">IC / Contact</th>
                <th className="px-4 py-3.5">Destination / Host</th>
                <th className="px-4 py-3.5">Vehicle</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredVisitors.map((v) => (
                <tr key={v.visitor_id} className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-white">{v.visitor_name}</div>
                    <div className="mt-0.5">{getTypeBadge(v.visitor_type)}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">
                    <div className="text-white">{v.visitor_ic_no}</div>
                    {v.contact_no && <div className="text-[11px] text-on-surface-variant mt-0.5">{v.contact_no}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">
                      {v.destination || (v.lease?.unit ? `Unit ${v.lease.unit.unit_number}` : "-")}
                    </div>
                    {v.lease?.tenant && (
                      <div className="text-[11px] text-primary truncate max-w-[130px]">
                        Host: {v.lease.tenant.user_name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {v.vehicle_plate ? (
                      <span className="font-mono font-bold text-amber-300 bg-surface-container-high px-1.5 py-0.5 rounded text-[11px]">
                        {v.vehicle_plate}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant opacity-40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-white font-medium">
                      {v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB") : "-"}
                    </div>
                    {v.check_in_time && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        In: {new Date(v.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={v.status || "Pending"} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {v.status === "Pending" ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(v.visitor_id, "Approved")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-500/25"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(v.visitor_id, "Declined")}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold hover:bg-rose-500/25"
                        >
                          Decline
                        </button>
                      </div>
                    ) : v.status === "Approved" ? (
                      <button
                        onClick={() => handleUpdateStatus(v.visitor_id, "Checked In")}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-500/30"
                      >
                        Check In
                      </button>
                    ) : v.status === "Checked In" ? (
                      <button
                        onClick={() => handleUpdateStatus(v.visitor_id, "Checked Out")}
                        className="px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold hover:bg-cyan-500/25"
                      >
                        Check Out
                      </button>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant opacity-50">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
