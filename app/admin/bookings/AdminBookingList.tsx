"use client";

import { useState, useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateBookingStatus } from "./actions";

type PropertyItem = {
  property_id: string;
  property_name: string;
};

type FacilityItem = {
  facility_id: string;
  facility_name: string;
  property_id: string;
};

type AdminBookingListProps = {
  bookings: any[];
  properties?: PropertyItem[];
  facilities?: FacilityItem[];
  defaultPropertyId?: string;
};

export default function AdminBookingList({
  bookings,
  properties = [],
  facilities = [],
  defaultPropertyId = "",
}: AdminBookingListProps) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState(
    defaultPropertyId && properties.some((p) => p.property_id === defaultPropertyId)
      ? defaultPropertyId
      : "ALL"
  );
  const [filterFacility, setFilterFacility] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateRange, setFilterDateRange] = useState<"ALL" | "TODAY" | "UPCOMING" | "PAST">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter facilities based on selected property
  const availableFacilities = facilities.filter((f) =>
    filterProperty === "ALL" || !filterProperty ? true : f.property_id === filterProperty
  );

  // Today Date Boundaries for comparisons
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Filter logic
  const filteredBookings = bookings.filter((b) => {
    // Property Filter
    const matchesProperty =
      filterProperty === "ALL" || !filterProperty
        ? true
        : b.facility?.property_id === filterProperty ||
          b.lease?.unit?.property_id === filterProperty;

    // Facility Filter
    const matchesFacility =
      filterFacility === "ALL" || !filterFacility
        ? true
        : b.facility_id === filterFacility;

    // Status Filter
    const matchesStatus =
      filterStatus === "ALL" || !filterStatus
        ? true
        : (b.booking_status || "Pending").toLowerCase() === filterStatus.toLowerCase();

    // Date Filter
    const bStart = new Date(b.start_time);
    let matchesDate = true;
    if (filterDateRange === "TODAY") {
      matchesDate = bStart >= todayStart && bStart <= todayEnd;
    } else if (filterDateRange === "UPCOMING") {
      matchesDate = bStart > todayEnd;
    } else if (filterDateRange === "PAST") {
      matchesDate = bStart < todayStart;
    }

    // Search Filter
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.facility?.facility_name?.toLowerCase().includes(q) ||
      b.lease?.tenant?.user_name?.toLowerCase().includes(q) ||
      b.lease?.unit?.unit_number?.toLowerCase().includes(q) ||
      b.purpose?.toLowerCase().includes(q) ||
      b.booking_id?.toLowerCase().includes(q);

    return matchesProperty && matchesFacility && matchesStatus && matchesDate && matchesSearch;
  });

  // KPI Calculations based on currently filtered property
  const propertyScopedBookings = bookings.filter((b) =>
    filterProperty === "ALL" || !filterProperty
      ? true
      : b.facility?.property_id === filterProperty ||
        b.lease?.unit?.property_id === filterProperty
  );

  const totalCount = propertyScopedBookings.length;
  const confirmedCount = propertyScopedBookings.filter((b) => (b.booking_status || "").toLowerCase() === "confirmed").length;
  const pendingCount = propertyScopedBookings.filter((b) => (b.booking_status || "").toLowerCase() === "pending").length;
  const todayCount = propertyScopedBookings.filter((b) => {
    const d = new Date(b.start_time);
    return d >= todayStart && d <= todayEnd;
  }).length;

  const handleUpdateStatus = (bookingId: string, status: string) => {
    setUpdatingId(bookingId);
    startTransition(async () => {
      await updateBookingStatus(bookingId, status);
      setUpdatingId(null);
    });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(isoString));
  };

  return (
    <div className="space-y-5">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Total Bookings
            </span>
            <span className="text-xl font-bold text-on-surface">{totalCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Confirmed
            </span>
            <span className="text-xl font-bold text-emerald-400">{confirmedCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Pending
            </span>
            <span className="text-xl font-bold text-amber-400">{pendingCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">today</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Today's Slots
            </span>
            <span className="text-xl font-bold text-indigo-300">{todayCount}</span>
          </div>
        </div>
      </div>

      {/* Multi-Filter & Search Bar */}
      <div className="glass-card rounded-xl p-4 border border-outline-variant/30 space-y-3 bg-surface-container-low">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="flex-1 w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search resident, unit, facility, purpose, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-lg border border-outline-variant shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-outline-variant/20">
          {/* 1. Property Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider block">
              Property
            </label>
            <select
              value={filterProperty}
              onChange={(e) => {
                setFilterProperty(e.target.value);
                setFilterFacility("ALL"); // Reset facility filter on property change
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none font-medium"
            >
              <option value="ALL">📋 All Properties</option>
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>
                  🏢 {p.property_name} {p.property_id === defaultPropertyId ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Facility Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider block">
              Facility
            </label>
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none"
            >
              <option value="ALL">🏊 All Facilities</option>
              {availableFacilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>
                  {f.facility_name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider block">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* 4. Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider block">
              Timeframe
            </label>
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none font-medium"
            >
              <option value="ALL">🗓️ All Dates</option>
              <option value="TODAY">📍 Today Only</option>
              <option value="UPCOMING">⏩ Upcoming</option>
              <option value="PAST">⏪ Past</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-on-surface-variant">
          Showing <span className="font-semibold text-on-surface">{filteredBookings.length}</span> of {bookings.length} bookings
        </span>
        {(search || filterProperty !== "ALL" || filterFacility !== "ALL" || filterStatus !== "ALL" || filterDateRange !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterProperty("ALL");
              setFilterFacility("ALL");
              setFilterStatus("ALL");
              setFilterDateRange("ALL");
            }}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Reset Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/40 rounded-2xl glass-card">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/60 mb-2 block">
            event_busy
          </span>
          <p className="font-medium text-sm text-on-surface">No bookings found matching your filters.</p>
          <p className="text-xs text-on-surface-variant mt-1">Try selecting a different property, facility, or date range.</p>
        </div>
      )}

      {/* 1. GRID CARDS VIEW */}
      {viewMode === "grid" && filteredBookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const isThisUpdating = updatingId === b.booking_id && isPending;
            const isConfirmed = b.booking_status?.toLowerCase() === "confirmed";
            const isPendingStatus = b.booking_status?.toLowerCase() === "pending";
            const isCancelled = b.booking_status?.toLowerCase() === "cancelled";
            const isCompleted = b.booking_status?.toLowerCase() === "completed";

            return (
              <div
                key={b.booking_id}
                className="glass-card rounded-xl p-5 flex flex-col justify-between border border-outline-variant/30 hover:border-primary/50 transition-all shadow-md group"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <h3
                        className="text-base font-bold text-on-surface truncate max-w-[210px]"
                        title={b.facility?.facility_name}
                      >
                        {b.facility?.facility_name}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        🏢 {b.facility?.property?.property_name || b.lease?.unit?.property?.property_name || "Testing"}
                      </p>
                    </div>
                    <StatusBadge status={b.booking_status || "Pending"} />
                  </div>

                  {/* Resident Info Pill */}
                  <div className="p-2.5 rounded-lg bg-surface-container-high/60 border border-outline-variant/30 text-xs mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                      <span className="font-semibold text-on-surface truncate">
                        {b.lease?.tenant?.user_name || "Resident"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-variant font-medium text-on-surface shrink-0">
                      Unit {b.lease?.unit?.unit_number || "N/A"}
                    </span>
                  </div>

                  {/* Booking Details */}
                  <div className="space-y-2 text-xs text-on-surface-variant border-t border-outline-variant/20 pt-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
                        <span>Date</span>
                      </div>
                      <span className="font-semibold text-on-surface font-mono">
                        {formatDate(b.booking_date || b.start_time)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                        <span>Time Slot</span>
                      </div>
                      <span className="font-semibold text-on-surface font-mono">
                        {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </span>
                    </div>

                    {b.pax_count && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">group</span>
                          <span>Pax Count</span>
                        </div>
                        <span className="font-medium text-on-surface">{b.pax_count} pax</span>
                      </div>
                    )}

                    {b.purpose && (
                      <div className="pt-1 text-[11px] text-on-surface-variant italic truncate" title={b.purpose}>
                        "{b.purpose}"
                      </div>
                    )}

                    {b.cancellation_reason && (
                      <div className="pt-1 text-[11px] text-rose-300 font-medium truncate" title={b.cancellation_reason}>
                        Reason: {b.cancellation_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex gap-2">
                  {isPendingStatus && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(b.booking_id, "Confirmed")}
                      disabled={isPending}
                      className="flex-1 btn-primary py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1 transition-all pressable disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>{isThisUpdating ? "Updating..." : "Approve"}</span>
                    </button>
                  )}

                  {isConfirmed && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(b.booking_id, "Completed")}
                      disabled={isPending}
                      className="flex-1 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1 transition-all pressable disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      <span>{isThisUpdating ? "Updating..." : "Mark Completed"}</span>
                    </button>
                  )}

                  {!isCancelled && !isCompleted && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(b.booking_id, "Cancelled")}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold transition-all pressable disabled:opacity-50 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">cancel</span>
                      <span>Cancel</span>
                    </button>
                  )}

                  {(isCancelled || isCompleted) && (
                    <div className="w-full py-1.5 text-center text-on-surface-variant text-xs font-mono opacity-60">
                      ID: #{b.booking_id.split("-")[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. TABLE VIEW */}
      {viewMode === "table" && filteredBookings.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden border border-outline-variant/30">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-container/60 border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3 font-medium">Booking ID</th>
                  <th className="px-5 py-3 font-medium">Facility</th>
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Resident & Unit</th>
                  <th className="px-5 py-3 font-medium">Date & Time</th>
                  <th className="px-5 py-3 font-medium">Purpose</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredBookings.map((b) => {
                  const isThisUpdating = updatingId === b.booking_id && isPending;
                  const isConfirmed = b.booking_status?.toLowerCase() === "confirmed";
                  const isPendingStatus = b.booking_status?.toLowerCase() === "pending";
                  const isCancelled = b.booking_status?.toLowerCase() === "cancelled";
                  const isCompleted = b.booking_status?.toLowerCase() === "completed";

                  return (
                    <tr key={b.booking_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-on-surface-variant">
                        #{b.booking_id.split("-")[0].toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-on-surface">
                        {b.facility?.facility_name}
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant">
                        {b.facility?.property?.property_name || b.lease?.unit?.property?.property_name || "Testing"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-on-surface">
                          {b.lease?.tenant?.user_name || "Resident"}
                        </div>
                        <div className="text-[11px] text-on-surface-variant font-mono">
                          Unit {b.lease?.unit?.unit_number}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-on-surface font-mono">
                          {formatDate(b.booking_date || b.start_time)}
                        </div>
                        <div className="text-[11px] text-on-surface-variant font-mono">
                          {formatTime(b.start_time)} – {formatTime(b.end_time)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 max-w-[180px] truncate text-on-surface-variant" title={b.purpose}>
                        {b.purpose || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={b.booking_status || "Pending"} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingStatus && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(b.booking_id, "Confirmed")}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold pressable disabled:opacity-50"
                            >
                              {isThisUpdating ? "..." : "Approve"}
                            </button>
                          )}
                          {isConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(b.booking_id, "Completed")}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 text-xs font-semibold pressable disabled:opacity-50"
                            >
                              {isThisUpdating ? "..." : "Complete"}
                            </button>
                          )}
                          {!isCancelled && !isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(b.booking_id, "Cancelled")}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-medium pressable disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
