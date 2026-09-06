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

/*
 * The accent rail used to be a colour hashed from the facility TYPE (DEV-86),
 * with a glow shadow - decoration carrying no information, on a page where the
 * question is which facilities are open. It could also land on violet, the
 * brand primary reserved for actions. The rail now carries status, matching
 * how the Units module uses it.
 */

/**
 * "Mon Tue Wed Thu Fri Sat Sun" is 27 characters against a label on a card
 * four to a row - it wrapped under "Days" and collided with it. A consecutive
 * run collapses to a range, and the full week says so in two words.
 */
function formatOpenDays(days: string[]): string {
  const nums = days.map(Number).filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b);
  if (nums.length === 0) return "—";
  if (nums.length === 7) return "Every day";
  const label = (n: number) => WEEKDAYS.find((w) => w.value === n)?.label ?? "";
  const isRun = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (isRun && nums.length > 2) return label(nums[0]) + "–" + label(nums[nums.length - 1]);
  return nums.map(label).join(" ");
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bookableFilter, setBookableFilter] = useState("ALL");

  // The edit form used to be a <details> accordion INSIDE the card. Opening it
  // grew that one card, and because the cards sit in a grid row, every card
  // beside it stretched to match. Editing one facility resized the whole row.
  // It is a modal now, so the grid never moves.
  const [editingFacility, setEditingFacility] = useState<any | null>(null);

  // Maintenance Date Filter States (Similar to Billing date filter)
  const [dateFilterShortcut, setDateFilterShortcut] = useState<"ALL" | "OVERDUE" | "30" | "60" | "90" | "CUSTOM">("ALL");
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
    const facilityId = String(formData.get("facility_id") || "");
    setUpdatingId(facilityId);

    startTransition(async () => {
      try {
        const res = await editFacilityAction(formData);
        if (res?.error) {
          showToast(res.error, "error");
        } else if (res?.success) {
          showToast(res.message, "success");
          setEditingFacility(null);
        }
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleToggleMaintenance = (facilityId: string, currentStatus: string) => {
    setUpdatingId(facilityId);
    startTransition(async () => {
      try {
        const res = await toggleMaintenanceAction(facilityId, currentStatus);
        if (res?.error) {
          showToast(res.error, "error");
        } else if (res?.success) {
          showToast(res.message, "success");
        }
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleDelete = (facilityId: string, facilityName: string) => {
    if (!confirm(`Are you sure you want to delete "${facilityName}"? This action cannot be undone.`)) return;

    setDeletingId(facilityId);
    startTransition(async () => {
      try {
        const res = await deleteFacilityAction(facilityId);
        if (res?.error) {
          showToast(res.error, "error");
        } else if (res?.success) {
          showToast(res.message, "success");
        }
      } finally {
        setDeletingId(null);
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

      // 5. Bookable Status Filter
      if (bookableFilter === "BOOKABLE" && !f.is_bookable) {
        return false;
      }
      if (bookableFilter === "NON_BOOKABLE" && f.is_bookable) {
        return false;
      }

      // 6. Maintenance Date Range Filter
      if (dateFilterShortcut !== "ALL") {
        if (!f.next_maintenance_date) return false;

        const maintDate = new Date(f.next_maintenance_date);
        if (isNaN(maintDate.getTime())) return false;
        maintDate.setHours(0, 0, 0, 0);

        if (dateFilterShortcut === "OVERDUE") {
          if (maintDate >= today) return false;
        } else if (dateFilterShortcut === "30") {
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
  }, [facilities, searchQuery, typeFilter, statusFilter, bookableFilter, dateFilterShortcut, customStartDate, customEndDate]);

  const isFilterActive =
    searchQuery.trim() !== "" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    bookableFilter !== "ALL" ||
    dateFilterShortcut !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setBookableFilter("ALL");
    setDateFilterShortcut("ALL");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  /** Days a scheduled maintenance date is past due, or 0 if it is not. */
  const daysOverdue = (value: any): number => {
    if (!value) return 0;
    const d = new Date(value);
    if (isNaN(d.getTime())) return 0;
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const diff = Math.floor((t.getTime() - d.getTime()) / 86_400_000);
    return diff > 0 ? diff : 0;
  };

  const overdueCount = facilities.filter((f) => daysOverdue(f.next_maintenance_date) > 0).length;

  const getDateFilterLabel = () => {
    switch (dateFilterShortcut) {
      case "OVERDUE":
        return "Overdue";
      case "30":
        return "Next 30 days";
      case "60":
        return "Next 60 days";
      case "90":
        return "Next 90 days";
      case "CUSTOM":
        return customStartDate || customEndDate
          ? `${customStartDate || "Start"} to ${customEndDate || "End"}`
          : "Custom range";
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
                  {p.property_name}
                </option>
              ))}
            </select>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant">
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
            <label className="text-[11px] font-bold text-on-surface-variant">
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
            <label className="text-[11px] font-bold text-on-surface-variant">
              Capacity <span className="font-normal text-on-surface-variant">— leave blank for no limit</span>
            </label>
            <input
              name="max_capacity"
              type="number"
              min="1"
              placeholder="e.g. 20 pax"
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant">
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
              <label className="text-[11px] font-bold text-on-surface-variant block">
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
            Filters
          </h3>

          {isFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1 font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="ALL">All types</option>
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
            <option value="ALL">Open and closed</option>
            <option value="AVAILABLE">Open only</option>
            <option value="MAINTENANCE">Closed for maintenance</option>
          </select>

          {/* Bookable Rule Filter */}
          <select
            value={bookableFilter}
            onChange={(e) => setBookableFilter(e.target.value)}
            className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
          >
            <option value="ALL">All Booking Rules</option>
            <option value="BOOKABLE">Residents can book</option>
            <option value="NON_BOOKABLE">Not bookable (lifts, corridors)</option>
          </select>
        </div>

        {/* Next-maintenance-due range filter */}
        <div ref={popoverRef} className="relative border-t border-outline-variant/30 pt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-on-surface-variant font-medium">
              Next maintenance due:
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
            Showing <strong className="text-primary font-bold">{filteredFacilities.length}</strong> of {facilities.length} facilities in this property
            {overdueCount > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setDateFilterShortcut("OVERDUE")}
                  className="font-semibold text-rose-300 underline-offset-2 hover:underline"
                >
                  {overdueCount} overdue
                </button>
              </>
            )}
          </div>

          {/* Date Filter Popover Panel */}
          {isDatePopoverOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-surface-container-high border border-outline-variant/80 shadow-2xl z-[120] p-4 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">build</span>
                  Next maintenance due
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
                <span className="text-[11px] font-bold text-on-surface-variant">Quick ranges</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "ALL", label: "All Dates" },
                    { id: "OVERDUE", label: "Overdue" },
                    { id: "30", label: "Next 30 days" },
                    { id: "60", label: "Next 60 days" },
                    { id: "90", label: "Next 90 days" },
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
                  Custom period
                </button>

                {dateFilterShortcut === "CUSTOM" && (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-on-surface-variant">Start Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded-lg bg-surface-container border border-outline-variant px-2.5 py-1.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-on-surface-variant">End Date</span>
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
          const isDeletingThis = deletingId === f.facility_id;
          const isUpdatingThis = updatingId === f.facility_id;

          return (
            <div
              key={f.facility_id}
              className={`glass-card rounded-xl p-6 flex flex-col relative overflow-hidden group transition-all ${
                isMaintenance ? "border-amber-500/40 bg-amber-950/10" : ""
              }`}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 ${
                  isMaintenance
                    ? "bg-amber-500"
                    : f.is_bookable
                    ? "bg-emerald-500"
                    : "bg-outline-variant"
                }`}
              />

              {/* Maintenance Banner */}
              {isMaintenance && (
                <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300">
                  <span className="material-symbols-outlined text-[16px] leading-none">engineering</span>
                  <span>Closed for maintenance</span>
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
                      : "text-on-surface-variant"
                  }`}
                  title={
                    isMaintenance
                      ? "Closed for maintenance"
                      : f.is_bookable
                      ? "Residents can book this"
                      : "Not bookable - shared space, listed for maintenance tracking"
                  }
                >
                  {isMaintenance ? "engineering" : f.is_bookable ? "event_available" : "lock"}
                </span>
              </div>

              <div className="space-y-2.5 mb-6 flex-1 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Property</span>
                  <span className="font-semibold text-on-surface">{propertyName}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-on-surface-variant">Type</span>
                  <span className="font-semibold text-primary">{f.facility_type || "General"}</span>
                </div>

                {f.is_bookable ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Capacity</span>
                      <span className="font-semibold text-on-surface">
                        {f.max_capacity ? `${f.max_capacity} pax` : "No limit"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Longest booking</span>
                      <span className="font-semibold text-on-surface">
                        {f.max_booking_hours ? `${f.max_booking_hours} hrs` : "No limit"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Open</span>
                      <span className="font-semibold text-on-surface">
                        {f.open_time || "08:00"}–{f.close_time || "22:00"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Days</span>
                      <span className="text-right font-semibold text-on-surface">
                        {formatOpenDays(opDaysList)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-outline-variant/40 bg-surface-container-high/40 px-3 py-2 text-[11px] text-on-surface-variant">
                    Residents cannot book this. It is listed so its maintenance can be
                    scheduled and tracked.
                  </div>
                )}

                {f.next_maintenance_date &&
                  (() => {
                    const late = daysOverdue(f.next_maintenance_date);
                    return (
                      <div
                        className={`flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-2 ${
                          late > 0 ? "text-rose-300" : "text-amber-300"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-[14px] leading-none">
                            {late > 0 ? "error" : "build"}
                          </span>
                          {late > 0 ? "Maintenance overdue" : "Next maintenance"}
                        </span>
                        <span className="text-right">
                          <span className="block font-mono font-bold">
                            {formatDate(f.next_maintenance_date)}
                          </span>
                          {late > 0 && (
                            <span className="block text-[10px] font-semibold">
                              {late} day{late === 1 ? "" : "s"} late
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                {f.is_bookable && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-on-surface-variant">Bookings so far</span>
                    <span className="font-semibold text-on-surface">{totalBookingsCount}</span>
                  </div>
                )}
              </div>

              {/* Maintenance Toggle Button */}
              <button
                type="button"
                onClick={() => handleToggleMaintenance(f.facility_id, f.facility_status || "Available")}
                disabled={isPending || isUpdatingThis || isDeletingThis}
                title={
                  isMaintenance
                    ? "Put this facility back in service so residents can book it again."
                    : f.is_bookable
                    ? "Residents will not be able to book this until you reopen it."
                    : "Mark this space as closed while work is carried out."
                }
                className={`w-full mb-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all pressable border disabled:opacity-50 ${
                  isMaintenance
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isUpdatingThis ? "progress_activity" : isMaintenance ? "check_circle" : "engineering"}
                </span>
                <span>
                  {isUpdatingThis
                    ? "Saving…"
                    : isMaintenance
                    ? "Reopen"
                    : "Close for maintenance"}
                </span>
              </button>

              {/* Edit Details Accordion */}
              <button
                type="button"
                onClick={() => setEditingFacility(f)}
                disabled={isPending || isUpdatingThis || isDeletingThis}
                className="pressable mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">edit</span>
                Edit details
              </button>

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
                  disabled={isPending || isDeletingThis}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50 pressable"
                >
                  {isDeletingThis ? (
                    <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  )}
                  {isDeletingThis ? "Deleting..." : "Delete"}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {/* Edit facility - modal, not an in-card accordion (see state above). */}
      {editingFacility &&
        (() => {
          const ef = editingFacility;
          const editOpDays = (ef.operation_days || "1,2,3,4,5,6,7").split(",");
          const isSavingEdit = updatingId === ef.facility_id;
          return (
            <div
              className="animate-fade-in fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => !isSavingEdit && setEditingFacility(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-outline-variant/80 bg-surface-container shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-6 py-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-white">Edit facility</h3>
                    <p className="truncate text-xs text-on-surface-variant">{ef.facility_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingFacility(null)}
                    disabled={isSavingEdit}
                    aria-label="Close"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="overflow-y-auto px-6 py-5 text-xs">
<form onSubmit={handleEditSubmit} id="edit-facility-form" className="grid gap-4">
                  <input type="hidden" name="facility_id" value={ef.facility_id} />

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Facility name</span>
                    <input
                      type="text"
                      name="facility_name"
                      defaultValue={ef.facility_name}
                      required
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Facility type</span>
                    <FacilityTypeCombobox
                      name="facility_type"
                      defaultValue={ef.facility_type}
                      existingTypes={existingTypes}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Status</span>
                    <select
                      name="facility_status"
                      defaultValue={ef.facility_status || "Available"}
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-sm"
                    >
                      <option value="Available">Available</option>
                      <option value="Maintenance">Closed for maintenance</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">
                      Capacity — blank means no limit
                    </span>
                    <input
                      type="number"
                      name="max_capacity"
                      min="1"
                      defaultValue={ef.max_capacity ?? ""}
                      placeholder="No limit"
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">Next maintenance date</span>
                    <input
                      type="date"
                      name="next_maintenance_date"
                      defaultValue={
                        ef.next_maintenance_date
                          ? new Date(ef.next_maintenance_date).toISOString().split("T")[0]
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
                          defaultChecked={editOpDays.includes(String(d.value))}
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
                      defaultValue={ef.open_time || "08:00"}
                      step={300}
                      className={timeInputClass}
                    />
                    <input
                      type="time"
                      name="close_time"
                      defaultValue={ef.close_time || "22:00"}
                      step={300}
                      className={timeInputClass}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-on-surface-variant font-medium">
                      Longest booking — blank means no limit
                    </span>
                    <input
                      type="number"
                      name="max_booking_hours"
                      min="1"
                      defaultValue={ef.max_booking_hours ?? ""}
                      placeholder="No limit"
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_bookable"
                      defaultChecked={ef.is_bookable}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span>Bookable by residents</span>
                  </label>

                </form>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 bg-surface-container-high/40 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setEditingFacility(null)}
                    disabled={isSavingEdit}
                    className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="edit-facility-form"
                    disabled={isPending || isSavingEdit}
                    className="pressable flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSavingEdit && (
                      <span className="material-symbols-outlined animate-spin-slow text-[16px] leading-none">
                        progress_activity
                      </span>
                    )}
                    {isSavingEdit ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
