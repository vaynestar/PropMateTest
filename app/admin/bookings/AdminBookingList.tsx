"use client";

import { useState, useTransition, useMemo } from "react";
import { normaliseBookingStatus } from "@/lib/booking-status";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateBookingStatus } from "./actions";

type FacilityItem = {
  facility_id: string;
  facility_name: string;
  property_id: string;
};

type AdminBookingListProps = {
  bookings: any[];
  facilities?: FacilityItem[];
};

export default function AdminBookingList({
  bookings,
  facilities = [],
}: AdminBookingListProps) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Main 2-Panel Tab State: 'active' | 'past'
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  // Filter States
  const [search, setSearch] = useState("");
  const [filterFacility, setFilterFacility] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Past Bookings Specific Date Range Filter (From Date - To Date)
  const [pastDateFrom, setPastDateFrom] = useState("");
  const [pastDateTo, setPastDateTo] = useState("");

  // The server already scopes to the active property.
  const availableFacilities = facilities;

  const now = new Date();

  // Helper to compute effective booking status (Auto-Complete once past end_time)
  const getEffectiveStatus = (b: any): string => {
    // Normalise first: rows written before lib/booking-status.ts carry
    // "Reserved", which nothing else in the app recognised.
    const rawStatus = normaliseBookingStatus(b.booking_status) || "Pending";
    if (rawStatus === "Cancelled") {
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

  // Split bookings into Active vs Past lists (Property-scoped for accurate tab count alignment)
  const { activeBookingsList, pastBookingsList, propertyScopedTotal } = useMemo(() => {
    const active: any[] = [];
    const past: any[] = [];
    let propTotal = 0;

    bookings.forEach((b) => {
      propTotal++;
      if (isBookingActive(b)) {
        active.push(b);
      } else {
        past.push(b);
      }
    });

    return {
      activeBookingsList: active,
      pastBookingsList: past,
      propertyScopedTotal: propTotal,
    };
  }, [bookings]);

  // Current tab source list
  const currentTabList = activeTab === "active" ? activeBookingsList : pastBookingsList;

  // Apply filters on current tab list
  const filteredBookings = currentTabList.filter((b) => {
    const effectiveStatus = getEffectiveStatus(b);

    // 1. Facility Filter
    const matchesFacility =
      filterFacility === "ALL" || !filterFacility
        ? true
        : b.facility_id === filterFacility;

    // 2. Status Filter
    const matchesStatus =
      filterStatus === "ALL" || !filterStatus
        ? true
        : effectiveStatus.toLowerCase() === filterStatus.toLowerCase();

    // 3. Past Date Range Filter (From / To)
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

    // 4. Search Filter
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.facility?.facility_name?.toLowerCase().includes(q) ||
      b.lease?.tenant?.user_name?.toLowerCase().includes(q) ||
      b.lease?.unit?.unit_number?.toLowerCase().includes(q) ||
      b.purpose?.toLowerCase().includes(q) ||
      b.booking_id?.toLowerCase().includes(q);

    return matchesFacility && matchesStatus && matchesDateRange && matchesSearch;
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

  /*
   * The KPI row used to be four cards: Active, Pending approval, Confirmed
   * active, Past archives. Active is Pending + Confirmed, so three of the four
   * restated each other, and the tab strip immediately below already shows the
   * active and past totals. None of them answered what an admin opens this page
   * to find out: what needs approving, and what is happening today.
   */
  const pendingCount = activeBookingsList.filter(
    (b) => (b.booking_status || "").toLowerCase() === "pending"
  ).length;

  const isSameDay = (iso: string, day: Date) => {
    const d = new Date(iso);
    return (
      d.getFullYear() === day.getFullYear() &&
      d.getMonth() === day.getMonth() &&
      d.getDate() === day.getDate()
    );
  };

  const today = new Date();
  const todayCount = activeBookingsList.filter((b) =>
    isSameDay(b.booking_date, today)
  ).length;

  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const next7Count = activeBookingsList.filter((b) => {
    const d = new Date(b.booking_date);
    return d > today && d <= weekAhead;
  }).length;


  return (
    <div className="space-y-6">
      {/* Three questions an admin actually has on this page. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`glass-card flex items-center gap-3 rounded-xl border p-3.5 ${
            pendingCount > 0 ? "border-amber-500/40" : "border-outline-variant/30"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-on-surface-variant">
              Waiting for approval
            </span>
            <span className="text-xl font-bold text-amber-400">{pendingCount}</span>
          </div>
        </div>

        <div className="glass-card flex items-center gap-3 rounded-xl border border-outline-variant/30 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <span className="material-symbols-outlined text-[22px]">today</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-on-surface-variant">Today</span>
            <span className="text-xl font-bold text-emerald-400">{todayCount}</span>
          </div>
        </div>

        <div className="glass-card flex items-center gap-3 rounded-xl border border-outline-variant/30 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[22px]">date_range</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-on-surface-variant">
              Next 7 days
            </span>
            <span className="text-xl font-bold text-on-surface">{next7Count}</span>
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
            <span>Upcoming</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
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
            <span>Past</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
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
        <div className="grid grid-cols-1 gap-2 border-t border-outline-variant/20 pt-2 md:grid-cols-2">
          {/* Property Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-on-surface-variant">
              Facility
            </label>
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none"
            >
              <option value="ALL">All facilities</option>
              {availableFacilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>
                  {f.facility_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-on-surface-variant">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-xs text-on-surface focus:border-primary outline-none"
            >
              <option value="ALL">All statuses</option>
              {activeTab === "active" ? (
                <>
                  <option value="Pending">Waiting for approval</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cancelled">Cancelled</option>
                </>
              ) : (
                <>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
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
          {activeTab === "active" ? "upcoming" : "past"} bookings in this property
        </span>
        {(search || filterFacility !== "ALL" || filterStatus !== "ALL" || pastDateFrom || pastDateTo) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterFacility("ALL");
              setFilterStatus("ALL");
              setPastDateFrom("");
              setPastDateTo("");
            }}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Reset Sub-Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/40 rounded-2xl glass-card">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/60 mb-2 block">
            {activeTab === "active" ? "event_available" : "history"}
          </span>
          <p className="text-sm font-medium text-on-surface">
            {activeTab === "active"
              ? "Nothing booked from today onwards"
              : "No past bookings match these filters"}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            {activeTab === "active"
              ? pastBookingsList.length > 0
                ? `Every booking for this property has already been and gone — ${pastBookingsList.length} of them are under Past.`
                : "Use New Booking above to reserve a facility for a resident."
              : "Try a different property, facility or status."}
          </p>
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
                  </div>

                  {/* Who it is for */}
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-high/60 p-2.5 text-xs">
                    {b.lease?.tenant?.user_name ? (
                      <>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-[16px] text-primary">
                            person
                          </span>
                          <span className="truncate font-semibold text-on-surface">
                            {b.lease.tenant.user_name}
                          </span>
                        </div>
                        {b.lease?.unit?.unit_number && (
                          <span className="shrink-0 rounded bg-surface-variant px-2 py-0.5 font-mono text-[11px] font-medium text-on-surface">
                            Unit {b.lease.unit.unit_number}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">person_off</span>
                        <span>Not linked to a lease</span>
                      </div>
                    )}
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
                        <span>Time</span>
                      </div>
                      <span className="font-semibold text-on-surface font-mono">
                        {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </span>
                    </div>

                    {b.pax_count && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">group</span>
                          <span>People</span>
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
                    {isCompleted && <span className="text-on-surface-variant">Took place as booked</span>}
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
                      <td className="px-5 py-3.5">
                        {b.lease?.tenant?.user_name ? (
                          <>
                            <div className="font-medium text-on-surface">
                              {b.lease.tenant.user_name}
                            </div>
                            {b.lease?.unit?.unit_number && (
                              <div className="font-mono text-[11px] text-on-surface-variant">
                                Unit {b.lease.unit.unit_number}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-on-surface-variant">Not linked to a lease</span>
                        )}
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
