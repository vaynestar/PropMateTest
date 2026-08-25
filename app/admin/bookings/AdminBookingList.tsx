"use client";

import { useState, useTransition, useMemo } from "react";
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

  // Main 2-Panel Tab State: 'active' | 'past'
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  // Filter States
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState(
    defaultPropertyId && properties.some((p) => p.property_id === defaultPropertyId)
      ? defaultPropertyId
      : "ALL"
  );
  const [filterFacility, setFilterFacility] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Past Bookings Specific Date Range Filter (From Date - To Date)
  const [pastDateFrom, setPastDateFrom] = useState("");
  const [pastDateTo, setPastDateTo] = useState("");

  // Available facilities scoped to selected property
  const availableFacilities = facilities.filter((f) =>
    filterProperty === "ALL" || !filterProperty ? true : f.property_id === filterProperty
  );

  const now = new Date();

  // Helper to compute effective booking status (Auto-Complete once past end_time)
  const getEffectiveStatus = (b: any): string => {
    const rawStatus = b.booking_status || "Pending";
    if (rawStatus === "Cancelled" || rawStatus === "Rejected") {
      return rawStatus;
    }
    const endTime = new Date(b.end_time).getTime();
    if (endTime < now.getTime()) {
      return "Completed"; // Auto-complete upon passing end date/time
    }
    return rawStatus;
  };

  // Helper to determine whether a booking is Active vs Past
  const isBookingActive = (b: any): boolean => {
    const effectiveStatus = getEffectiveStatus(b);
    if (effectiveStatus === "Cancelled" || effectiveStatus === "Rejected" || effectiveStatus === "Completed") {
      return false;
    }
    const endTime = new Date(b.end_time).getTime();
    return endTime >= now.getTime();
  };

  // Split bookings into Active vs Past lists
  const { activeBookingsList, pastBookingsList } = useMemo(() => {
    const active: any[] = [];
    const past: any[] = [];

    bookings.forEach((b) => {
      if (isBookingActive(b)) {
        active.push(b);
      } else {
        past.push(b);
      }
    });

    return { activeBookingsList: active, pastBookingsList: past };
  }, [bookings]);

  // Current tab source list
  const currentTabList = activeTab === "active" ? activeBookingsList : pastBookingsList;

  // Apply filters on current tab list
  const filteredBookings = currentTabList.filter((b) => {
    const effectiveStatus = getEffectiveStatus(b);

    // 1. Property Filter
    const matchesProperty =
      filterProperty === "ALL" || !filterProperty
        ? true
        : b.facility?.property_id === filterProperty ||
          b.lease?.unit?.property_id === filterProperty;

    // 2. Facility Filter
    const matchesFacility =
      filterFacility === "ALL" || !filterFacility
        ? true
        : b.facility_id === filterFacility;

    // 3. Status Filter
    const matchesStatus =
      filterStatus === "ALL" || !filterStatus
        ? true
        : effectiveStatus.toLowerCase() === filterStatus.toLowerCase();

    // 4. Past Date Range Filter (From / To)
    let matchesDateRange = true;
    if (activeTab === "past") {
      const bDate = new Date(b.booking_date || b.start_time);
      bDate.setHours(0, 0, 0, 0);

      if (pastDateFrom) {
        const fromD = new Date(pastDateFrom);
        fromD.setHours(0, 0, 0, 0);
        if (bDate < fromD) matchesDateRange = false;
      }
      if (pastDateTo) {
        const toD = new Date(pastDateTo);
        toD.setHours(23, 59, 59, 999);
        if (bDate > toD) matchesDateRange = false;
      }
    }

    // 5. Search Filter
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.facility?.facility_name?.toLowerCase().includes(q) ||
      b.lease?.tenant?.user_name?.toLowerCase().includes(q) ||
      b.lease?.unit?.unit_number?.toLowerCase().includes(q) ||
      b.purpose?.toLowerCase().includes(q) ||
      b.booking_id?.toLowerCase().includes(q);

    return matchesProperty && matchesFacility && matchesStatus && matchesDateRange && matchesSearch;
  });

  // Action: Update status (Approve or Cancel)
  const handleUpdateStatus = (bookingId: string, status: string) => {
    setUpdatingId(bookingId);
    startTransition(async () => {
      await updateBookingStatus(bookingId, status);
      setUpdatingId(null);
    });
  };

  // Date helpers for past quick shortcuts
  const handleQuickPastRange = (rangeType: "all" | "this-month" | "30-days" | "90-days") => {
    const today = new Date();
    if (rangeType === "all") {
      setPastDateFrom("");
      setPastDateTo("");
    } else if (rangeType === "this-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setPastDateFrom(firstDay.toISOString().split("T")[0]);
      setPastDateTo(today.toISOString().split("T")[0]);
    } else if (rangeType === "30-days") {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setPastDateFrom(past30.toISOString().split("T")[0]);
      setPastDateTo(today.toISOString().split("T")[0]);
    } else if (rangeType === "90-days") {
      const past90 = new Date();
      past90.setDate(today.getDate() - 90);
      setPastDateFrom(past90.toISOString().split("T")[0]);
      setPastDateTo(today.toISOString().split("T")[0]);
    }
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

  // Scoped KPIs
  const propertyScopedList = bookings.filter((b) =>
    filterProperty === "ALL" || !filterProperty
      ? true
      : b.facility?.property_id === filterProperty ||
        b.lease?.unit?.property_id === filterProperty
  );
  const activeCount = propertyScopedList.filter((b) => isBookingActive(b)).length;
  const pendingCount = propertyScopedList.filter((b) => isBookingActive(b) && (b.booking_status || "").toLowerCase() === "pending").length;
  const confirmedCount = propertyScopedList.filter((b) => isBookingActive(b) && (b.booking_status || "").toLowerCase() === "confirmed").length;
  const pastCount = propertyScopedList.filter((b) => !isBookingActive(b)).length;

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">bolt</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Active Bookings
            </span>
            <span className="text-xl font-bold text-emerald-400">{activeCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Pending Approval
            </span>
            <span className="text-xl font-bold text-amber-400">{pendingCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Confirmed Active
            </span>
            <span className="text-xl font-bold text-on-surface">{confirmedCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/30">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">history</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
              Past Archives
            </span>
            <span className="text-xl font-bold text-blue-300">{pastCount}</span>
          </div>
        </div>
      </div>

      {/* 2-PANEL MAIN TABS */}
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("active");
              setFilterStatus("ALL");
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
              activeTab === "active"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">event_available</span>
            <span>Active Bookings</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === "active"
                  ? "bg-on-primary/20 text-on-primary"
                  : "bg-surface-container-highest text-on-surface-variant"
              }`}
            >
              {activeBookingsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("past");
              setFilterStatus("ALL");
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
              activeTab === "past"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>Past Bookings</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                activeTab === "past"
                  ? "bg-on-primary/20 text-on-primary"
                  : "bg-surface-container-highest text-on-surface-variant"
              }`}
            >
              {pastBookingsList.length}
            </span>
          </button>
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

      {/* FILTER CONTROL BAR */}
      <div className="glass-card rounded-xl p-4 border border-outline-variant/30 space-y-3 bg-surface-container-low">
        {/* Search & Main Row */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder={`Search ${activeTab === "active" ? "active" : "past"} bookings by resident, unit, facility, purpose, or ID...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>

        {/* Dropdowns Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20">
          {/* Property Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider block">
              Property
            </label>
            <select
              value={filterProperty}
              onChange={(e) => {
                setFilterProperty(e.target.value);
                setFilterFacility("ALL");
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

          {/* Facility Filter */}
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

          {/* Status Filter */}
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
              {activeTab === "active" ? (
                <>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                </>
              ) : (
                <>
                  <option value="Completed">Completed (Auto)</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Rejected">Rejected</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* PAST BOOKINGS DATE RANGE FILTER (From Date - To Date) */}
        {activeTab === "past" && (
          <div className="pt-2 border-t border-outline-variant/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                Date Range:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={pastDateFrom}
                  onChange={(e) => setPastDateFrom(e.target.value)}
                  className="px-2 py-1 rounded bg-surface-container-high border border-outline-variant text-xs text-on-surface font-mono outline-none focus:border-primary"
                  title="From Date"
                />
                <span className="text-xs text-on-surface-variant">to</span>
                <input
                  type="date"
                  value={pastDateTo}
                  onChange={(e) => setPastDateTo(e.target.value)}
                  className="px-2 py-1 rounded bg-surface-container-high border border-outline-variant text-xs text-on-surface font-mono outline-none focus:border-primary"
                  title="To Date"
                />
              </div>
            </div>

            {/* Quick Range Shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickPastRange("all")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                  !pastDateFrom && !pastDateTo
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface-container-high border-outline-variant text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All Past
              </button>
              <button
                type="button"
                onClick={() => handleQuickPastRange("this-month")}
                className="px-2.5 py-1 rounded text-[11px] font-medium bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleQuickPastRange("30-days")}
                className="px-2.5 py-1 rounded text-[11px] font-medium bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickPastRange("90-days")}
                className="px-2.5 py-1 rounded text-[11px] font-medium bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Last 90 Days
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-on-surface-variant">
          Showing <span className="font-semibold text-on-surface">{filteredBookings.length}</span> of {currentTabList.length}{" "}
          {activeTab === "active" ? "active" : "past"} bookings
        </span>
        {(search || filterProperty !== "ALL" || filterFacility !== "ALL" || filterStatus !== "ALL" || pastDateFrom || pastDateTo) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterProperty("ALL");
              setFilterFacility("ALL");
              setFilterStatus("ALL");
              setPastDateFrom("");
              setPastDateTo("");
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
            {activeTab === "active" ? "event_available" : "history"}
          </span>
          <p className="font-medium text-sm text-on-surface">
            No {activeTab === "active" ? "active" : "past"} bookings found matching your filters.
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Try adjusting your search keywords, property, or date range.</p>
        </div>
      )}

      {/* 1. GRID CARDS VIEW */}
      {viewMode === "grid" && filteredBookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const isThisUpdating = updatingId === b.booking_id && isPending;
            const effectiveStatus = getEffectiveStatus(b);
            const isPendingStatus = effectiveStatus.toLowerCase() === "pending";
            const isCancelled = effectiveStatus.toLowerCase() === "cancelled";
            const isCompleted = effectiveStatus.toLowerCase() === "completed";

            return (
              <div
                key={b.booking_id}
                className="glass-card rounded-xl p-5 flex flex-col justify-between border border-outline-variant/30 hover:border-primary/50 transition-all shadow-md group"
              >
                <div>
                  {/* Standardized Booking ID at Top + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-outline-variant/20">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/40 tracking-wider">
                      #{b.booking_id.split("-")[0].toUpperCase()}
                    </span>
                    <StatusBadge status={effectiveStatus} />
                  </div>

                  {/* Facility & Property Header */}
                  <div className="mb-3">
                    <h3
                      className="text-base font-bold text-on-surface truncate max-w-[240px]"
                      title={b.facility?.facility_name}
                    >
                      {b.facility?.facility_name}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                      🏢 {b.facility?.property?.property_name || b.lease?.unit?.property?.property_name || "Testing"}
                    </p>
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

                {/* Card Action Buttons (Active Bookings Only) */}
                {activeTab === "active" && (
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

                    {!isCancelled && !isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(b.booking_id, "Cancelled")}
                        disabled={isPending}
                        className={`py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold transition-all pressable disabled:opacity-50 flex items-center justify-center gap-1 ${
                          isPendingStatus ? "px-3" : "w-full"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">cancel</span>
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Past Bookings Footer Notice */}
                {activeTab === "past" && (
                  <div className="mt-4 pt-3 border-t border-outline-variant/20 text-center text-on-surface-variant text-[11px]">
                    {isCompleted && <span className="text-blue-300/80">✨ Session completed</span>}
                    {isCancelled && <span className="text-rose-300/80">🚫 Booking cancelled</span>}
                  </div>
                )}
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
                  {activeTab === "active" && (
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredBookings.map((b) => {
                  const isThisUpdating = updatingId === b.booking_id && isPending;
                  const effectiveStatus = getEffectiveStatus(b);
                  const isPendingStatus = effectiveStatus.toLowerCase() === "pending";
                  const isCancelled = effectiveStatus.toLowerCase() === "cancelled";
                  const isCompleted = effectiveStatus.toLowerCase() === "completed";

                  return (
                    <tr key={b.booking_id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-on-surface-variant font-semibold">
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
                        <StatusBadge status={effectiveStatus} />
                      </td>
                      {activeTab === "active" && (
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
                      )}
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
