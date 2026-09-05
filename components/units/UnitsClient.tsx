"use client";

import { useState, useMemo, useEffect, useActionState } from "react";
import Link from "next/link";
import UnitFormModal from "./UnitFormModal";
import UnitEditModal from "./UnitEditModal";
import UnitDeleteModal from "./UnitDeleteModal";
import { updateUnitStatusAction, updateUnitRemarkAction } from "@/app/admin/units/actions";
import { setActiveProperty } from "@/app/actions/property-actions";
import {
  unitStatus,
  UNIT_STATUSES,
  UNIT_STATUS_ORDER,
  type UnitStatusKey,
} from "@/lib/unit-status";

interface UnitItem {
  unit_id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  floor_number: number;
  area_sqft: any;
  monthly_rent?: any;
  status: string;
  status_remark?: string | null;
  property?: {
    property_id: string;
    property_name: string;
  };
  leases?: {
    lease_id: string;
    status: string;
    tenant?: {
      user_id: string;
      user_name: string;
      user_email: string;
      phone_number: string | null;
    };
  }[];
}

interface UnitsClientProps {
  initialUnits: UnitItem[];
  properties: { property_id: string; property_name: string }[];
  activePropertyId: string | null;
  activePropertyName: string | null;
  contextOutOfSync: boolean;
}

/** Statuses that warrant an explanation. */
const REMARK_STATUSES: string[] = ["Repair", "Not Available"];

/**
 * Status control. Carries the status colour itself, so the state of a unit is
 * legible from the control rather than only from a separate badge.
 */
function InlineStatusSelector({
  unit,
  status,
  onSelect,
}: {
  unit: UnitItem;
  status: string;
  onSelect: (next: string | null) => void;
}) {
  const [state, formAction, isPending] = useActionState(updateUnitStatusAction, null);
  const isLeased = !!unit.leases && unit.leases.length > 0;
  const meta = unitStatus(status);

  // If the server rejects the change, drop the optimistic value and fall back
  // to whatever is actually persisted.
  useEffect(() => {
    if (state?.error) onSelect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // A save used to be completely silent — only failures showed. Changing a
  // dozen units gave no sign anything had persisted.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!state?.success) return;
    setJustSaved(true);
    const timer = setTimeout(() => setJustSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <form action={formAction} className="relative shrink-0">
      <input type="hidden" name="unit_id" value={unit.unit_id} />
      <select
        // Remount when the status changes. React's controlled-<select> value
        // tracker can hold a stale node value after a change event, which is
        // what made the label keep saying "Vacant" while the colour updated.
        key={status}
        name="status"
        value={status}
        aria-label={`Status for unit ${unit.unit_number}`}
        onChange={(e) => {
          onSelect(e.target.value);
          e.target.form?.requestSubmit();
        }}
        disabled={isPending}
        className={`appearance-none text-[11px] font-semibold rounded-lg border pl-2.5 pr-6 py-1.5 outline-none cursor-pointer transition-colors disabled:opacity-50 ${meta.chip}`}
      >
        {UNIT_STATUS_ORDER.map((key) => {
          const opt = UNIT_STATUSES[key];
          const blocked = key === "Occupied" && !isLeased;
          return (
            <option key={key} value={key} disabled={blocked} className={opt.option}>
              {opt.label}
              {blocked ? " — needs a lease" : ""}
            </option>
          );
        })}
      </select>

      {isPending ? (
        <span className="material-symbols-outlined animate-spin-slow pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[13px]">
          progress_activity
        </span>
      ) : justSaved ? (
        <span className="material-symbols-outlined pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[14px] text-emerald-300">
          check
        </span>
      ) : (
        <span
          className="material-symbols-outlined pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[14px] opacity-70"
          aria-hidden="true"
        >
          expand_more
        </span>
      )}

      {justSaved && (
        <span role="status" className="sr-only">
          Status saved
        </span>
      )}

      {state?.error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 max-w-[16rem] rounded-md border border-rose-500/40 bg-surface-container px-2 py-1 text-[10px] leading-snug text-rose-300 shadow-lg"
        >
          {state.error}
        </span>
      )}
    </form>
  );
}

/**
 * Editable note explaining why a unit is under Repair or Reserved. Shown only
 * for those statuses, but the stored text survives a status change so the
 * history is not thrown away.
 */
function StatusRemark({ unit, status }: { unit: UnitItem; status: string }) {
  const [state, formAction, isPending] = useActionState(updateUnitRemarkAction, null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(unit.status_remark ?? "");
  const meta = unitStatus(status);

  useEffect(() => setValue(unit.status_remark ?? ""), [unit.status_remark]);
  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  const saved = state?.success ? (state.remark as string | null) : unit.status_remark;

  if (editing) {
    return (
      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="unit_id" value={unit.unit_id} />
        <label
          htmlFor={`remark-${unit.unit_id}`}
          className="block text-[11px] font-semibold text-on-surface"
        >
          {meta.label} note
          <span className="ml-1 font-normal text-on-surface-variant">
            — why this unit is off the market
          </span>
        </label>
        <textarea
          id={`remark-${unit.unit_id}`}
          name="status_remark"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={500}
          rows={2}
          autoFocus
          placeholder={
            status === "Repair"
              ? "e.g. Bathroom waterproofing, contractor booked 12 Sept"
              : "e.g. Held for incoming tenant, viewing on Friday"
          }
          className="w-full resize-y rounded-md border border-outline-variant/60 bg-surface-container px-2.5 py-2 text-[11px] leading-snug text-white outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-on-surface-variant">{value.length}/500</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setValue(unit.status_remark ?? "");
                setEditing(false);
              }}
              className="pressable rounded-md border border-outline-variant/60 bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="pressable flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isPending && (
                <span className="material-symbols-outlined animate-spin-slow text-[13px]">
                  progress_activity
                </span>
              )}
              Save note
            </button>
          </div>
        </div>
        {state?.error && (
          <p role="alert" className="text-[10px] text-rose-300">
            {state.error}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-dashed border-outline-variant/50 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`text-[10px] font-semibold uppercase-none ${meta.text}`}>
            {meta.label} note
          </span>
          <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant">
            {saved ? saved : <span className="italic opacity-70">No note yet.</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="pressable shrink-0 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
        >
          {saved ? "Edit" : "Add"}
        </button>
      </div>
    </div>
  );
}

/**
 * Occupancy meter for a floor. Each segment is a real control: hovering or
 * tab-focusing it shows the exact count and share, positioned over that
 * segment. Replaces the native `title` tooltip, which was slow to appear and
 * could not be styled or reached by keyboard.
 */
function FloorMeter({ counts, total }: { counts: Record<string, number>; total: number }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (total === 0) return null;

  const present = UNIT_STATUS_ORDER.filter((k) => counts[k] > 0);

  // Cumulative widths, so the tooltip can sit over the centre of its segment.
  let acc = 0;
  const segments = present.map((k) => {
    const width = (counts[k] / total) * 100;
    const centre = acc + width / 2;
    acc += width;
    return { key: k, width, centre, count: counts[k], pct: Math.round(width) };
  });

  const active = segments.find((s) => s.key === hovered);

  return (
    <div className="relative">
      <div className="flex h-2 w-full overflow-hidden rounded-b-[7px] bg-surface-container">
        {segments.map((s) => (
          <button
            key={s.key}
            type="button"
            style={{ width: `${s.width}%` }}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.key)}
            onBlur={() => setHovered(null)}
            aria-label={`${s.count} ${UNIT_STATUSES[s.key as UnitStatusKey].label}, ${s.pct}% of this floor`}
            className={`h-full cursor-default outline-none transition-[filter,opacity] hover:brightness-125 focus-visible:brightness-125 ${
              UNIT_STATUSES[s.key as UnitStatusKey].rail
            } ${hovered && hovered !== s.key ? "opacity-45" : ""}`}
          />
        ))}
      </div>

      {active && (
        <div
          role="status"
          style={{ left: `${active.centre}%` }}
          className="pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-outline-variant bg-surface-container-highest px-2.5 py-1.5 shadow-lg"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                UNIT_STATUSES[active.key as UnitStatusKey].rail
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold text-white">
              {active.count} {UNIT_STATUSES[active.key as UnitStatusKey].label}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {active.pct}% of {total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** One unit. Status comes from the list, so card, filters and counts agree. */
function UnitCard({
  unit,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  unit: UnitItem;
  onEdit: (u: UnitItem) => void;
  onDelete: (u: UnitItem) => void;
  onStatusChange: (unitId: string, next: string | null) => void;
}) {
  const status = unit.status;
  const activeLease = unit.leases?.[0];
  const tenant = activeLease?.tenant;
  const meta = unitStatus(status);
  // Deleting a leased unit was offered identically to deleting a vacant one;
  // the guard only appeared inside the modal, one click after commitment.
  const hasActiveLease = (unit.leases?.length ?? 0) > 0;

  return (
    <article className="group relative flex flex-col justify-between gap-3 overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-high/60 p-4 pl-5 transition-colors hover:border-outline-variant">
      {/* Status rail — the one bold mark on the card. Lets a manager read a
          whole floor's state without reading any text. */}
      <span
        className={`absolute inset-y-0 left-0 w-1 transition-colors ${meta.rail}`}
        aria-hidden="true"
      />

      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-white">{unit.unit_number}</h4>
            <span className="text-[11px] text-on-surface-variant">{unit.unit_type}</span>
          </div>
          <InlineStatusSelector
            unit={unit}
            status={status}
            onSelect={(next) => onStatusChange(unit.unit_id, next)}
          />
        </div>

        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Floor area</dt>
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              straighten
            </span>
            <dd>{Number(unit.area_sqft)} sqft</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Monthly rent</dt>
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              payments
            </span>
            <dd>RM {Number(unit.monthly_rent || 0).toLocaleString()}</dd>
          </div>
        </dl>

        {tenant ? (
          <div className="mt-3 rounded-md border border-outline-variant/40 bg-surface-container/70 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-white">{tenant.user_name}</span>
              {activeLease && (
                <Link
                  href={`/admin/leases?unit=${encodeURIComponent(unit.unit_number)}`}
                  className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
                >
                  View lease
                </Link>
              )}
            </div>
            <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">
              {tenant.user_email}
            </span>
          </div>
        ) : REMARK_STATUSES.includes(status) ? (
          <StatusRemark unit={unit} status={status} />
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-outline-variant/40 p-2.5 text-[11px] text-on-surface-variant">
            No tenant yet.
          </p>
        )}
      </div>

      {/* Blue for the safe action, red for the destructive one — the two are
          told apart by colour before either label is read. */}
      <div className="flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(unit)}
            className="pressable flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              edit
            </span>
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(unit)}
            disabled={hasActiveLease}
            title={
              hasActiveLease
                ? `${unit.unit_number} has an active lease. End the lease before deleting the unit.`
                : undefined
            }
            className="pressable flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:border-outline-variant/40 disabled:bg-surface-container disabled:text-on-surface-variant/50 disabled:hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              delete
            </span>
            Delete
          </button>
        </div>

        {status === "Vacant" ? (
          <Link
            href="/admin/leases"
            className="pressable rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
          >
            Create lease
          </Link>
        ) : activeLease ? (
          <Link
            href={`/admin/leases/${activeLease.lease_id}/charges`}
            className="pressable rounded-md border border-outline-variant/60 bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface transition-colors hover:text-white"
          >
            Billing
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function UnitsClient({
  initialUnits,
  properties,
  activePropertyId,
  activePropertyName,
  contextOutOfSync,
}: UnitsClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<UnitItem | null>(null);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(new Set());

  // A ?property= deep link can point somewhere other than the top-bar
  // selection. Push it into the universal context so the two never disagree.
  useEffect(() => {
    if (contextOutOfSync && activePropertyId) setActiveProperty(activePropertyId);
  }, [contextOutOfSync, activePropertyId]);

  // Optimistic status lives here, not in the card, so a change is visible to
  // the filters, the counts and the floor meter in the same frame.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const units = useMemo(
    () =>
      initialUnits.map((u) => {
        const override = statusOverrides[u.unit_id];
        return override && override !== u.status ? { ...u, status: override } : u;
      }),
    [initialUnits, statusOverrides]
  );

  // Once the server catches up, drop the override so the row is server-driven again.
  useEffect(() => {
    setStatusOverrides((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const [id, value] of Object.entries(prev)) {
        const persisted = initialUnits.find((u) => u.unit_id === id)?.status;
        if (persisted === value || persisted === undefined) changed = true;
        else next[id] = value;
      }
      return changed ? next : prev;
    });
  }, [initialUnits]);

  const handleStatusChange = (unitId: string, next: string | null) => {
    setStatusOverrides((prev) => {
      const copy = { ...prev };
      if (next === null) delete copy[unitId];
      else copy[unitId] = next;
      return copy;
    });
  };

  // `units` is already confined to the active property by the server, so every
  // filter and figure below is scoped to it by construction.
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesStatus =
        statusFilter === "ALL" || u.status.toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const activeTenant = u.leases?.[0]?.tenant;
      const matchesSearch =
        !q ||
        u.unit_number.toLowerCase().includes(q) ||
        u.unit_type.toLowerCase().includes(q) ||
        u.floor_number.toString().includes(q) ||
        (u.status_remark ?? "").toLowerCase().includes(q) ||
        (activeTenant &&
          (activeTenant.user_name.toLowerCase().includes(q) ||
            activeTenant.user_email.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [units, statusFilter, searchQuery]);

  const unitsByFloor = useMemo(() => {
    const map = new Map<number, UnitItem[]>();
    for (const u of filteredUnits) {
      if (!map.has(u.floor_number)) map.set(u.floor_number, []);
      map.get(u.floor_number)!.push(u);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, floorUnits]) => ({
        floor,
        units: floorUnits.sort((a, b) =>
          a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true })
        ),
      }));
  }, [filteredUnits]);

  const countOf = (key: UnitStatusKey) => units.filter((u) => u.status === key).length;
  const totalUnits = units.length;
  const occupiedUnits = countOf("Occupied");
  const vacantUnits = countOf("Vacant");
  const repairUnits = countOf("Repair");
  const reservedUnits = countOf("Not Available");
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const allFloors = unitsByFloor.map((f) => f.floor);
  const allCollapsed = allFloors.length > 0 && allFloors.every((f) => collapsedFloors.has(f));

  const toggleFloor = (floor: number) =>
    setCollapsedFloors((prev) => {
      const next = new Set(prev);
      if (next.has(floor)) next.delete(floor);
      else next.add(floor);
      return next;
    });

  const toggleAllFloors = () =>
    setCollapsedFloors(allCollapsed ? new Set() : new Set(allFloors));

  const kpis = [
    {
      label: "Total units",
      value: totalUnits,
      detail: activePropertyName ?? "No property selected",
      icon: "apartment",
      accent: "bg-surface-container-high border-outline-variant/60 text-on-surface-variant",
      detailClass: "text-on-surface-variant",
    },
    {
      label: "Occupied",
      value: occupiedUnits,
      detail: `${occupancyPct}% occupancy`,
      icon: UNIT_STATUSES.Occupied.icon,
      accent: UNIT_STATUSES.Occupied.accent,
      detailClass: UNIT_STATUSES.Occupied.text,
    },
    {
      label: "Vacant",
      value: vacantUnits,
      detail: vacantUnits > 0 ? "Available to lease" : "None available",
      icon: UNIT_STATUSES.Vacant.icon,
      accent: UNIT_STATUSES.Vacant.accent,
      detailClass: UNIT_STATUSES.Vacant.text,
    },
    {
      label: "Repair",
      value: repairUnits,
      detail:
        reservedUnits > 0
          ? `${reservedUnits} also reserved`
          : repairUnits > 0
          ? "Off the market"
          : "Nothing out of service",
      icon: UNIT_STATUSES.Repair.icon,
      accent: UNIT_STATUSES.Repair.accent,
      detailClass: UNIT_STATUSES.Repair.text,
    },
  ];

  const statusCounts: Record<string, number> = {
    Vacant: vacantUnits,
    Occupied: occupiedUnits,
    Repair: repairUnits,
    "Not Available": reservedUnits,
  };

  const filters = [
    {
      key: "ALL",
      label: "All",
      count: totalUnits,
      dot: "",
      activeClass: "bg-primary text-on-primary",
    },
    ...UNIT_STATUS_ORDER.map((k) => ({
      key: k as string,
      label: UNIT_STATUSES[k].label,
      count: statusCounts[k] ?? 0,
      dot: UNIT_STATUSES[k].rail,
      activeClass: `${UNIT_STATUSES[k].chip} border`,
    })),
  ];

  const isFiltered = searchQuery !== "" || statusFilter !== "ALL";

  // "No units match these filters" gave no clue which constraint was to blame.
  // Name the one that is actually excluding things.
  const activeStatusLabel =
    statusFilter === "ALL"
      ? null
      : UNIT_STATUSES[statusFilter as UnitStatusKey]?.label ?? statusFilter;
  const trimmedQuery = searchQuery.trim();

  const emptyHeadline = !isFiltered
    ? "No units yet"
    : activeStatusLabel && trimmedQuery
    ? `No ${activeStatusLabel} units match “${trimmedQuery}”`
    : activeStatusLabel
    ? `No ${activeStatusLabel} units in ${activePropertyName ?? "this property"}`
    : `No units match “${trimmedQuery}”`;

  const emptyDetail = !isFiltered
    ? activePropertyName
      ? `Add the first unit to ${activePropertyName}.`
      : "Add a property first."
    : activeStatusLabel && trimmedQuery
    ? "Try another status, or clear the search."
    : activeStatusLabel
    ? "Every unit here is in a different state."
    : "Check the unit number, layout, tenant name or note.";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container p-4"
          >
            <div className="min-w-0">
              <span className="text-xs font-medium text-on-surface-variant">{k.label}</span>
              <div className="mt-1 text-2xl font-bold leading-none text-white">{k.value}</div>
              <span className={`mt-1.5 block truncate text-[11px] ${k.detailClass}`}>
                {k.detail}
              </span>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${k.accent}`}
            >
              <span className="material-symbols-outlined text-[22px]">{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls. No property picker here — units are managed one property at
          a time and the property is chosen once, in the top bar. */}
      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface-container p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative flex-1 xl:max-w-md">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search units"
            placeholder="Search unit number, layout, tenant or note"
            className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-high py-2 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <div
            role="group"
            aria-label="Filter by status"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-high/60 p-1"
          >
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                aria-pressed={statusFilter === f.key}
                className={`pressable flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === f.key
                    ? f.activeClass
                    : "border border-transparent text-on-surface-variant hover:text-white"
                }`}
              >
                {f.dot && (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${f.dot}`} aria-hidden="true" />
                )}
                <span>{f.label}</span>
                <span className="tabular-nums opacity-60">{f.count}</span>
              </button>
            ))}
          </div>

          {allFloors.length > 1 && (
            <button
              type="button"
              onClick={toggleAllFloors}
              className="pressable flex shrink-0 items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface-container-high px-2.5 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {allCollapsed ? "unfold_more" : "unfold_less"}
              </span>
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={!activePropertyId}
            className="pressable flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            <span>Add unit</span>
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {unitsByFloor.map(({ floor, units: floorUnits }) => {
          const counts = UNIT_STATUS_ORDER.reduce<Record<string, number>>((acc, k) => {
            acc[k] = floorUnits.filter((u) => u.status === k).length;
            return acc;
          }, {});
          const collapsed = collapsedFloors.has(floor);
          const panelId = `floor-panel-${floor}`;

          return (
            <section
              key={floor}
              className="space-y-4 rounded-xl border border-outline-variant/60 bg-surface-container p-5"
            >
              {/* The floor band reads as a drawer front: press it to open, with
                  the occupancy strip fused to its bottom edge as a fill gauge.
                  Collapsing dims the whole band, so a folded floor is obvious
                  from across the page rather than only from a rotated chevron. */}
              <header
                className={`rounded-lg border transition-colors ${
                  collapsed
                    ? "border-outline-variant/40 bg-surface-container-high/40"
                    : "border-outline-variant/60 bg-surface-container-high"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleFloor(floor)}
                    aria-expanded={!collapsed}
                    aria-controls={panelId}
                    className="pressable flex items-center gap-2.5 rounded-md border border-outline-variant/60 bg-surface-container-highest py-2 pl-2 pr-3 text-left transition-colors hover:border-primary/50 hover:bg-surface-variant"
                  >
                    <span
                      className="material-symbols-outlined rounded bg-primary/15 p-0.5 text-[20px] leading-none text-primary transition-transform"
                      style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                    <span className="block">
                      <h3 className="text-sm font-bold leading-tight text-white">Floor {floor}</h3>
                      <span className="text-[11px] text-on-surface-variant">
                        {floorUnits.length} unit{floorUnits.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="ml-1 border-l border-outline-variant/50 pl-3 text-[11px] font-semibold text-on-surface-variant">
                      {collapsed ? "Show" : "Hide"}
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-1 text-[11px]">
                    {UNIT_STATUS_ORDER.filter((k) => counts[k] > 0).map((k) => (
                      <span key={k} className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${UNIT_STATUSES[k].rail}`}
                          aria-hidden="true"
                        />
                        <span className={`font-medium ${UNIT_STATUSES[k].text}`}>
                          {counts[k]} {UNIT_STATUSES[k].label}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <FloorMeter counts={counts} total={floorUnits.length} />
              </header>

              {!collapsed && (
                <div
                  id={panelId}
                  className="grid grid-cols-1 gap-3 border-t border-outline-variant/30 pt-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                >
                  {floorUnits.map((unit) => (
                    <UnitCard
                      key={unit.unit_id}
                      unit={unit}
                      onEdit={setEditingUnit}
                      onDelete={setDeletingUnit}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {unitsByFloor.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px] opacity-40" aria-hidden="true">
                meeting_room
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{emptyHeadline}</h4>
              <p className="mt-1 text-xs text-on-surface-variant">{emptyDetail}</p>
            </div>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="pressable rounded-lg border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
              >
                Clear filters
              </button>
            ) : (
              activePropertyId && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="pressable rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90"
                >
                  Add unit
                </button>
              )
            )}
          </div>
        )}
      </div>

      <UnitFormModal
        properties={properties}
        activePropertyId={activePropertyId ?? undefined}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <UnitEditModal
        unit={editingUnit}
        properties={properties}
        isOpen={!!editingUnit}
        onClose={() => setEditingUnit(null)}
      />

      <UnitDeleteModal
        unit={deletingUnit}
        isOpen={!!deletingUnit}
        onClose={() => setDeletingUnit(null)}
      />
    </div>
  );
}
