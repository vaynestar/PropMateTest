"use client";

import { useState, useMemo, useTransition, useRef, useEffect } from "react";
import ExpandableForm from "@/components/layout/ExpandableForm";
import FacilityTypeCombobox from "@/components/facilities/FacilityTypeCombobox";
import {
  addFacilityAction,
  editFacilityAction,
  deleteFacilityAction,
  toggleMaintenanceAction,
} from "@/app/admin/facilities/actions";

const TYPE_ACCENT: Record<string, string> = {
  "Swimming Pool": "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
  Gym: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
  "Function Hall": "bg-primary shadow-[0_0_10px_rgba(208,188,255,0.5)]",
  "Badminton Court": "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
  "BBQ Area": "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]",
  "Multi-purpose Hall": "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]",
  Other: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
};

const DYNAMIC_PALETTE = [
  "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
  "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
  "bg-primary shadow-[0_0_10px_rgba(208,188,255,0.5)]",
  "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
  "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]",
  "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]",
  "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
  "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]",
  "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]",
  "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]",
  "bg-lime-500 shadow-[0_0_10px_rgba(132,204,22,0.5)]",
];

function getFacilityAccentColor(type: string = ""): string {
  const trimmed = type.trim();
  if (TYPE_ACCENT[trimmed]) return TYPE_ACCENT[trimmed];
  if (!trimmed) return TYPE_ACCENT.Other;

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[index];
}

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

const timeInputClass =
  "rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-xs";

function formatDate(date: Date | string) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
}

interface AdminFacilitiesManagerProps {
  facilities: any[];
  allProperties: any[];
  activeProperty?: any;
  existingTypes: string[];
}

export default function AdminFacilitiesManager({
  facilities,
  allProperties,
  activeProperty,
  existingTypes,
}: AdminFacilitiesManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Maintenance Date Filter States (Similar to Billing date filter)
  const [dateFilterShortcut, setDateFilterShortcut] = useState<"ALL" | "30" | "60" | "90" | "CUSTOM">("ALL");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close date popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsDatePopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const res = await addFacilityAction(formData);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
        formEl.reset();
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await editFacilityAction(formData);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
      }
    });
  };

  const handleToggleMaintenance = (facilityId: string, currentStatus: string) => {
    startTransition(async () => {
      const res = await toggleMaintenanceAction(facilityId, currentStatus);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
      }
    });
  };

  const handleDelete = (facilityId: string, facilityName: string) => {
    if (!confirm(`Are you sure you want to delete "${facilityName}"? This action cannot be undone.`)) return;

    startTransition(async () => {
      const res = await deleteFacilityAction(facilityId);
      if (res?.error) {
        showToast(res.error, "error");
      } else if (res?.success) {
        showToast(res.message, "success");
      }
    });
  };

  // Filter Computation
  const filteredFacilities = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return facilities.filter((f) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = f.facility_name?.toLowerCase().includes(query);
        const matchType = f.facility_type?.toLowerCase().includes(query);
        const matchProp = f.property?.property_name?.toLowerCase().includes(query);
        if (!matchName && !matchType && !matchProp) return false;
      }

      // 2. Property Filter
      if (propertyFilter !== "ALL" && f.property_id !== propertyFilter) {
        return false;
      }

      // 3. Facility Type Filter
      if (typeFilter !== "ALL" && f.facility_type !== typeFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter === "AVAILABLE" && f.facility_status === "Maintenance") {
        return false;
      }
      if (statusFilter === "MAINTENANCE" && f.facility_status !== "Maintenance") {
        return false;
      }

      // 5. Maintenance Date Range Filter
      if (dateFilterShortcut !== "ALL") {
        if (!f.next_maintenance_date) return false;

        const maintDate = new Date(f.next_maintenance_date);
        if (isNaN(maintDate.getTime())) return false;
        maintDate.setHours(0, 0, 0, 0);

        if (dateFilterShortcut === "30") {
          const maxDate = new Date(today);
          maxDate.setDate(maxDate.getDate() + 30);
          if (maintDate < today || maintDate > maxDate) return false;
        } else if (dateFilterShortcut === "60") {
          const maxDate = new Date(today);
          maxDate.setDate(maxDate.getDate() + 60);
          if (maintDate < today || maintDate > maxDate) return false;
        } else if (dateFilterShortcut === "90") {
          const maxDate = new Date(today);
          maxDate.setDate(maxDate.getDate() + 90);
          if (maintDate < today || maintDate > maxDate) return false;
        } else if (dateFilterShortcut === "CUSTOM") {
          if (customStartDate) {
            const startD = new Date(customStartDate);
            startD.setHours(0, 0, 0, 0);
            if (maintDate < startD) return false;
          }
          if (customEndDate) {
            const endD = new Date(customEndDate);
            endD.setHours(23, 59, 59, 999);
            if (maintDate > endD) return false;
          }
        }
      }

      return true;
    });
  }, [facilities, searchQuery, propertyFilter, typeFilter, statusFilter, dateFilterShortcut, customStartDate, customEndDate]);

  const isFilterActive =
    searchQuery.trim() !== "" ||
    propertyFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    dateFilterShortcut !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setPropertyFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setDateFilterShortcut("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const getDateFilterLabel = () => {
    switch (dateFilterShortcut) {
      case "30":
        return "⚡ Next 30 Days";
      case "60":
        return "⚡ Next 60 Days";
      case "90":
        return "⚡ Next 90 Days";
      case "CUSTOM":
        return customStartDate || customEndDate
          ? `📅 ${customStartDate || "Start"} to ${customEndDate || "End"}`
          : "📅 Custom Range";
      default:
        return "Maintenance Date: All";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`p-4 rounded-xl border shadow-xl flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-3 ${
            toast.type === "success"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px]">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-on-surface-variant hover:text-on-surface p-1"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Expandable Form: Add Facility */}
      <ExpandableForm title="Add Facility" buttonLabel="New Facility">
        <form onSubmit={handleAddSubmit} className="grid gap-4 md:grid-cols-2">
          {/* Target Property */}
          {activeProperty ? (
            <div className="md:col-span-2 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                <span className="text-xs text-on-surface">
                  Target Property: <strong className="text-primary font-bold">{activeProperty.property_name}</strong>
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium bg-surface-container-high px-2 py-0.5 rounded">
                Auto-preset from active top bar selection
              </span>
              <input type="hidden" name="property_id" value={activeProperty.property_id} />
            </div>
          ) : (
            <select
              name="property_id"
              required
              defaultValue={allProperties[0]?.property_id || ""}
              className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
            >
              {allProperties.map((p) => (
                <option key={p.property_id} value={p.property_id}>
                  🏢 {p.property_name}
                </option>
              ))}
            </select>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase">
              Facility Name <span className="text-rose-400">*</span>
            </label>
            <input
              name="facility_name"
              placeholder="e.g. Olympic Pool / Gym Level 3"
              required
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase">
              Facility Type (Type or Select) <span className="text-rose-400">*</span>
            </label>
            <FacilityTypeCombobox
              name="facility_type"
              defaultValue=""
              existingTypes={existingTypes}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase">
              Max Capacity (Optional / Leave blank for Unlimited)
            </label>
            <input
              name="max_capacity"
              type="number"
              min="1"
              placeholder="Unlimited (Optional)"
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase">
              Max Booking Hours (Optional)
            </label>
            <input
              name="max_booking_hours"
              type="number"
              min="1"
              placeholder="Unlimited (Optional)"
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm"
            />
          </div>

          {/* Maintenance Decision & Date */}
          <div className="md:col-span-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_under_maintenance"
                className="w-4 h-4 accent-amber-500 rounded"
              />
              <span className="font-semibold text-xs text-amber-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">engineering</span>
                Currently Under Maintenance?
              </span>
            </label>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase block">
                Next Maintenance Date (Optional)
              </label>
              <input
                type="date"
                name="next_maintenance_date"
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 md:col-span-2 text-on-surface cursor-pointer">
            <input
              type="checkbox"
              name="is_bookable"
              defaultChecked
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            <span className="font-label-md text-label-md">
              Residents can book this facility
            </span>
          </label>

          <div className="md:col-span-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Open on (Monday-first)
            </span>
            <div className="flex flex-wrap gap-3 mt-2">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-1.5 text-on-surface cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="operation_days"
                    value={d.value}
                    defaultChecked
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span className="font-label-md text-label-md">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Opens at
            </span>
            <input
              type="time"
              name="open_time"
              defaultValue="08:00"
              step={300}
              className={timeInputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Closes at
            </span>
            <input
              type="time"
              name="close_time"
              defaultValue="22:00"
              step={300}
              className={timeInputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all md:col-span-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {isPending ? "progress_activity" : "add"}
            </span>
            {isPending ? "Adding Facility..." : "Add Facility"}
          </button>
        </form>
      </ExpandableForm>

      {/* Requirement 2: Filter Options Bar */}
      <div className="glass-card rounded-2xl p-4 border border-outline-variant/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
            Facility Filters & Maintenance Schedule
          </h3>

          {isFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1 font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facility name..."
              className="w-full rounded-xl bg-surface-container-high border border-outline-variant pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
            />
          </div>

          {/* Property Filter */}
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="ALL">🏢 All Properties</option>
            {allProperties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="ALL">🏷️ All Types</option>
            {existingTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="ALL">📌 All Statuses</option>
            <option value="AVAILABLE">✅ Available Only</option>
            <option value="MAINTENANCE">🛠️ Under Maintenance Only</option>
          </select>
        </div>

        {/* ⚡ Next Maintenance Date Range Filter (Pop-over picker) */}
        <div ref={popoverRef} className="relative border-t border-outline-variant/30 pt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-on-surface-variant font-medium">
              Maintenance Date Filter:
            </span>
            <button
              type="button"
              onClick={() => setIsDatePopoverOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all pressable ${
                dateFilterShortcut !== "ALL"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-surface-container-high text-on-surface border-outline-variant hover:border-primary/50"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>{getDateFilterLabel()}</span>
              <span className="material-symbols-outlined text-[16px]">
                {isDatePopoverOpen ? "arrow_drop_up" : "arrow_drop_down"}
              </span>
            </button>
          </div>

          {/* Active Results Counter */}
          <div className="text-xs text-on-surface-variant">
            Showing <strong className="text-primary font-bold">{filteredFacilities.length}</strong> of {facilities.length} facilities
          </div>

          {/* Date Filter Popover Panel */}
          {isDatePopoverOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-surface-container-high border border-outline-variant/80 shadow-2xl z-[120] p-4 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">build</span>
                  Next Maintenance Date
                </h4>
                <button
                  type="button"
                  onClick={() => setIsDatePopoverOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Quick Shortcuts */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase">Quick Range Shortcuts</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "ALL", label: "All Dates" },
                    { id: "30", label: "⚡ Next 30 Days" },
                    { id: "60", label: "⚡ Next 60 Days" },
                    { id: "90", label: "⚡ Next 90 Days" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setDateFilterShortcut(s.id as any);
                        if (s.id !== "CUSTOM") setIsDatePopoverOpen(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        dateFilterShortcut === s.id
                          ? "bg-amber-500 text-black font-bold"
                          : "bg-surface-container-highest text-on-surface hover:bg-primary/20"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Period Input */}
              <div className="space-y-2 border-t border-outline-variant/30 pt-3">
                <button
                  type="button"
                  onClick={() => setDateFilterShortcut("CUSTOM")}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    dateFilterShortcut === "CUSTOM"
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-surface-container-highest text-on-surface hover:bg-primary/20"
                  }`}
                >
                  📅 Custom Period
                </button>

                {dateFilterShortcut === "CUSTOM" && (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-on-surface-variant uppercase">Start Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded-lg bg-surface-container border border-outline-variant px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-on-surface-variant uppercase">End Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full rounded-lg bg-surface-container border border-outline-variant px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {filteredFacilities.length === 0 && (
          <div className="col-span-full p-8 text-center text-on-surface-variant glass-card rounded-2xl border border-dashed border-outline-variant/40 space-y-2">
            <span className="material-symbols-outlined text-[36px] opacity-40">filter_alt_off</span>
            <p className="font-body-md text-body-md">No facilities found matching your selected filters.</p>
            {isFilterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn-secondary px-4 py-1.5 text-xs font-semibold mt-2"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {filteredFacilities.map((f) => {
          const isMaintenance = f?.facility_status === "Maintenance";
          const propertyName = f?.property?.property_name || "General Property";
          const opDaysList = (f?.operation_days || "1,2,3,4,5,6,7").split(",");
          const totalBookingsCount = f?._count?.bookings ?? 0;

          return (
            <div
              key={f.facility_id}
              className={`glass-card rounded-xl p-6 flex flex-col relative overflow-hidden group transition-all ${
                isMaintenance ? "border-amber-500/40 bg-amber-950/10" : ""
              }`}
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${getFacilityAccentColor(f.facility_type)}`}
              />

              {/* Maintenance Banner */}
              {isMaintenance && (
                <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">engineering</span>
                  <span>UNDER MAINTENANCE</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <h4 className="font-title-lg text-title-lg text-on-surface font-bold pr-6">
                  {f.facility_name || "Unnamed Facility"}
                </h4>
                <span
                  className={`material-symbols-outlined ${
                    isMaintenance
                      ? "text-amber-400"
                      : f.is_bookable
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                  title={isMaintenance ? "Under Maintenance" : f.is_bookable ? "Bookable" : "Locked"}
                >
                  {isMaintenance ? "engineering" : f.is_bookable ? "event_available" : "lock"}
                </span>
              </div>

              <div className="space-y-2.5 mb-6 flex-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Property</span>
                  <span className="font-semibold text-on-surface">{propertyName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Type</span>
                  <span className="font-semibold text-primary">{f.facility_type || "General"}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Max Capacity</span>
                  <span className="font-semibold text-on-surface">
                    {f.max_capacity ? `${f.max_capacity} pax` : "Unlimited"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Max Booking</span>
                  <span className="font-semibold text-on-surface">
                    {f.max_booking_hours ? `${f.max_booking_hours} hrs` : "Unlimited"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Operating Hours</span>
                  <span className="font-semibold text-on-surface">
                    {f.open_time || "08:00"}–{f.close_time || "22:00"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Open Days</span>
                  <span className="font-semibold text-on-surface">
                    {opDaysList
                      .map((d: string) => WEEKDAYS.find((w) => String(w.value) === d)?.label)
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>

                {f.next_maintenance_date && (
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30 text-amber-300">
                    <span className="flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">build</span>
                      Next Maint:
                    </span>
                    <span className="font-mono font-bold">{formatDate(f.next_maintenance_date)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Total Bookings</span>
                  <span className="font-semibold text-on-surface">{totalBookingsCount}</span>
                </div>
              </div>

              {/* Maintenance Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggleMaintenance(f.facility_id, f.facility_status || "Available")}
                disabled={isPending}
                className={`w-full mb-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all pressable border disabled:opacity-50 ${
                  isMaintenance
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isMaintenance ? "check_circle" : "engineering"}
                </span>
                <span>{isMaintenance ? "Set Status: Available" : "Set Status: Under Maintenance"}</span>
              </button>

              {/* Edit Details Accordion */}
              <details className="mb-3 rounded-lg border border-outline-variant/40 px-3 py-2 text-xs">
                <summary className="cursor-pointer font-semibold text-primary hover:underline">
                  Edit facility details
                </summary>
                <form onSubmit={handleEditSubmit} className="grid gap-3 mt-3">
                  <input type="hidden" name="facility_id" value={f.facility_id} />

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Facility Name</span>
                    <input
                      type="text"
                      name="facility_name"
                      defaultValue={f.facility_name}
                      required
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Facility Type</span>
                    <FacilityTypeCombobox
                      name="facility_type"
                      defaultValue={f.facility_type}
                      existingTypes={existingTypes}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Status</span>
                    <select
                      name="facility_status"
                      defaultValue={f.facility_status || "Available"}
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs"
                    >
                      <option value="Available">Available</option>
                      <option value="Maintenance">Under Maintenance</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">
                      Max Capacity (Empty = Unlimited)
                    </span>
                    <input
                      type="number"
                      name="max_capacity"
                      min="1"
                      defaultValue={f.max_capacity ?? ""}
                      placeholder="Unlimited"
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Next Maintenance Date</span>
                    <input
                      type="date"
                      name="next_maintenance_date"
                      defaultValue={
                        f.next_maintenance_date
                          ? new Date(f.next_maintenance_date).toISOString().split("T")[0]
                          : ""
                      }
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => (
                      <label
                        key={d.value}
                        className="flex items-center gap-1 text-on-surface cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="operation_days"
                          value={d.value}
                          defaultChecked={opDaysList.includes(String(d.value))}
                          className="w-3.5 h-3.5 accent-[var(--color-primary)]"
                        />
                        <span className="text-[11px]">{d.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      name="open_time"
                      defaultValue={f.open_time || "08:00"}
                      step={300}
                      className={timeInputClass}
                    />
                    <input
                      type="time"
                      name="close_time"
                      defaultValue={f.close_time || "22:00"}
                      step={300}
                      className={timeInputClass}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">
                      Max booking hours (empty = unlimited)
                    </span>
                    <input
                      type="number"
                      name="max_booking_hours"
                      min="1"
                      defaultValue={f.max_booking_hours ?? ""}
                      placeholder="Unlimited"
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-xs"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_bookable"
                      defaultChecked={f.is_bookable}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span>Bookable by residents</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </details>

              {/* Requirement 1: Restored Previous Delete Button Design */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDelete(f.facility_id, f.facility_name);
                }}
                className="mt-auto"
              >
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50 pressable"
                >
                  {isPending ? (
                    <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  )}
                  {isPending ? "Deleting..." : "Delete"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
