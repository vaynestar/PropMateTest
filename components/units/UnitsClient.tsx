"use client";

import { useRouter } from "next/navigation";

import { useState, useMemo, useEffect, useActionState } from "react";
import Link from "next/link";
import UnitFormModal from "./UnitFormModal";
import UnitEditModal from "./UnitEditModal";
import UnitDeleteModal from "./UnitDeleteModal";
import { updateUnitStatusAction, updateUnitRemarkAction } from "@/app/admin/units/actions";
import { rowOpenProps } from "@/components/admin/rowLink";
import { setActiveProperty } from "@/app/actions/property-actions";
import {
  unitStatus,
  UNIT_STATUSES,
  UNIT_STATUS_ORDER,
  type UnitStatusKey,
} from "@/lib/unit-status";
import ScrollHint from "@/components/ui/ScrollHint";
import { EmptyState, Money, TABLE } from "@/components/admin/ui";
import StatusBadge from "@/components/dashboard/StatusBadge";

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
const REMARK_STATUSES: string[] = ["Repair"];

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
          <div className="mt-3 border-t border-outline-variant/40 pt-2.5">
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

          {/* Delete left the card (DEV-263). It does not belong, in red, once
              per unit on a screen that can hold 240 of them — and a card has
              no room to say what deleting one actually destroys. It lives on
              the unit's own page now, where the consequence is spelled out. */}
          <Link
            href={`/admin/units/${unit.unit_id}`}
            className="pressable flex items-center gap-1 rounded-md border border-outline-variant/60 bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface transition-colors hover:text-white"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              open_in_new
            </span>
            Open
          </Link>
        </div>

        {status === "Vacant" ? (
          <Link
            // Carries the unit through, so the leases page opens already
            // filtered to it instead of the whole property's list.
            href={`/admin/leases?unit=${encodeURIComponent(unit.unit_number)}`}
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
  owesByUnit = {},
  openByUnit = {},
}: UnitsClientProps & {
  owesByUnit?: Record<string, number>;
  openByUnit?: Record<string, { repairs: number; slips: number; unbilled: boolean }>;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  /*
   * Two ways to look at the same units (DEV-262). The list answers "which
   * unit needs me"; the floor view answers "what does the building look
   * like". Both are legitimate questions, so neither is a mode that hides
   * the other — and the list is the default, because one floor as cards is
   * 1,872px of screen against about 430px as rows.
   */
  const [view, setView] = useState<"list" | "floors">("list");
  const [floorFilter, setFloorFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"number" | "owed" | "open">("number");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<UnitItem | null>(null);
  const [collapsedFloors, setCollapsedFloors] = useState<Set<number>>(new Set());

  /*
   * `?edit=<unit_id>` opens that unit's edit form straight away (DEV-263).
   * The unit file's menu links here rather than carrying a second copy of
   * the form, and the parameter is dropped once the modal is open so a
   * refresh does not reopen it.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const wanted = new URLSearchParams(window.location.search).get("edit");
    if (!wanted) return;
    const target = initialUnits.find((u) => u.unit_id === wanted);
    if (target) {
      setEditingUnit(target);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [initialUnits]);

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

  /*
   * The page's own tile row, hand-built before components/admin/ui.tsx
   * existed: four cards, each with a coloured icon chip and a caption. It
   * now uses the shared StatCard like every other module, which also drops
   * the four icon chips and the captions that only restated the label
   * ("Off the market", "None available").
   */
  const kpis = [
    { label: "Total units", value: totalUnits, tone: "neutral" as const },
    {
      label: "Occupied",
      value: occupiedUnits,
      hint: `${occupancyPct}%`,
      tone: "positive" as const,
    },
    { label: "Vacant", value: vacantUnits, tone: "primary" as const },
    {
      label: "Repair",
      value: repairUnits,
      hint: reservedUnits > 0 ? `${reservedUnits} also reserved` : undefined,
      tone: repairUnits > 0 ? ("warning" as const) : ("neutral" as const),
    },
  ];

  const statusCounts: Record<string, number> = {
    Vacant: vacantUnits,
    Occupied: occupiedUnits,
    Repair: repairUnits,
    "Not Available": reservedUnits,
  };

  /*
   * "In arrears" is a filter the register never had (DEV-262). Status says
   * whether somebody lives there; it says nothing about whether they are
   * paying, which is the other half of the question.
   */
  const arrearsCount = units.filter((u) => (owesByUnit[u.unit_id] ?? 0) > 0).length;

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
    {
      key: "ARREARS",
      label: "Owes money",
      count: arrearsCount,
      dot: "bg-rose-400",
      activeClass: "border border-rose-500/40 bg-rose-500/15 text-rose-300",
    },
  ];

  /** The floors offered in the Floor selector, newest building order. */
  const floorOptions = [...new Set(units.map((u) => u.floor_number))].sort((a, b) => a - b);

  /** The rows the list view shows: chips, floor, search and sort applied. */
  const listRows = units
    .filter((u) => {
      if (statusFilter === "ARREARS") {
        if ((owesByUnit[u.unit_id] ?? 0) <= 0) return false;
      } else if (statusFilter !== "ALL" && u.status !== statusFilter) {
        return false;
      }
      if (floorFilter !== "ALL" && String(u.floor_number) !== floorFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const tenant = u.leases?.find((l: any) => l.status === "Active")?.tenant?.user_name ?? "";
      return (
        u.unit_number.toLowerCase().includes(q) ||
        (u.unit_type ?? "").toLowerCase().includes(q) ||
        tenant.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "owed") return (owesByUnit[b.unit_id] ?? 0) - (owesByUnit[a.unit_id] ?? 0);
      if (sortBy === "open") {
        const score = (id: string) => {
          const o = openByUnit[id];
          return o ? o.repairs + o.slips + (o.unbilled ? 1 : 0) : 0;
        };
        return score(b.unit_id) - score(a.unit_id);
      }
      return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true });
    });

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** "1 repair · slip to check" — what is actually outstanding on this unit. */
  const openLabel = (id: string) => {
    const o = openByUnit[id];
    if (!o) return null;
    const parts: string[] = [];
    if (o.repairs) parts.push(`${o.repairs} repair${o.repairs === 1 ? "" : "s"}`);
    if (o.slips) parts.push(`slip to check`);
    if (o.unbilled) parts.push("no charges set");
    return parts.length ? parts.join(" · ") : null;
  };

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
    <div className="space-y-5">
      {/* The counts ARE the filters (DEV-262). Four read-only tiles sat above
          a separate four-button filter group saying the same four numbers. */}
      <nav aria-label="Filter units" className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = statusFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setStatusFilter(f.key)}
              className={`pressable inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-outline-variant/60 bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f.dot && <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${f.dot}`} aria-hidden="true" />}
              {f.label}
              <span
                className={`rounded-full px-2 py-px text-[11px] font-bold tabular-nums ${
                  on ? "bg-primary/25 text-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Controls. No property picker here — units are managed one property at
          a time and the property is chosen once, in the top bar. */}
      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container p-4 xl:flex-row xl:items-center xl:justify-between">
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

        {/* The status chips moved above this bar; what is left is the three
            controls that narrow and order what the chips selected. */}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {floorOptions.length > 1 && (
              <>
                <label
                  htmlFor="floor-filter"
                  className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Floor
                </label>
                <select
                  id="floor-filter"
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="h-10 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-sm text-on-surface outline-none focus:border-primary"
                >
                  <option value="ALL">Every floor</option>
                  {floorOptions.map((f) => (
                    <option key={f} value={String(f)}>
                      Floor {f}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label
              htmlFor="unit-sort"
              className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Sort
            </label>
            <select
              id="unit-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="number">Unit number</option>
              <option value="owed">Most owed</option>
              <option value="open">Most open items</option>
            </select>

            {/* Two ways to look at the same units — see the note on `view`. */}
            <div
              role="group"
              aria-label="How to show the units"
              className="flex items-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container p-1"
            >
              {([
                { key: "list" as const, label: "List", icon: "format_list_bulleted" },
                { key: "floors" as const, label: "Floors", icon: "grid_view" },
              ]).map((v) => (
                <button
                  key={v.key}
                  type="button"
                  aria-pressed={view === v.key}
                  onClick={() => setView(v.key)}
                  className={`pressable inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    view === v.key
                      ? "bg-primary/15 text-primary"
                      : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{v.icon}</span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view === "floors" && allFloors.length > 1 && (
              <button
                type="button"
                onClick={toggleAllFloors}
                className="pressable flex flex-1 items-center justify-center gap-1 rounded-lg border border-outline-variant/60 bg-surface-container-high px-2.5 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white xl:flex-none xl:shrink-0"
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
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50 xl:flex-none xl:shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                add
              </span>
              <span>Add unit</span>
            </button>
          </div>
        </div>
      </div>

      {view === "list" && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-2.5 text-xs text-on-surface-variant">
            <span>
              Showing <span className="font-semibold tabular-nums text-on-surface">{listRows.length}</span> of{" "}
              <span className="tabular-nums">{totalUnits}</span>
            </span>
            {picked.size > 0 && (
              <span className="flex items-center gap-2">
                <span className="font-semibold text-on-surface">{picked.size} selected</span>
                <button
                  type="button"
                  onClick={() => setPicked(new Set())}
                  className="font-semibold text-primary hover:underline"
                >
                  Clear
                </button>
              </span>
            )}
          </div>

          {/* Cards below md. Eight columns do not survive a phone, and a
              table that scrolls sideways is a table nobody reads. */}
          <div className="divide-y divide-outline-variant/30 md:hidden">
            {listRows.length === 0 ? (
              <EmptyState
                icon="meeting_room"
                title={totalUnits === 0 ? "No units in this property yet" : "No units match these filters"}
                hint={
                  totalUnits === 0
                    ? "Add the first unit — tenancies, invoices and tickets all hang off one."
                    : "Try another chip, or clear the search."
                }
              />
            ) : (
              listRows.map((u) => {
                const activeLease = u.leases?.find((l: any) => l.status === "Active");
                const owes = owesByUnit[u.unit_id] ?? 0;
                const open = openLabel(u.unit_id);
                return (
                  <Link
                    key={u.unit_id}
                    href={`/admin/units/${u.unit_id}`}
                    className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-white">{u.unit_number}</span>
                        <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                          {[u.unit_type, u.area_sqft ? `${u.area_sqft.toLocaleString("en-MY")} sqft` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <StatusBadge status={u.status} variant="unit" />
                    </div>

                    <p className="mt-1.5 text-xs text-on-surface-variant">
                      {activeLease?.tenant?.user_name ?? "Nobody living here"}
                    </p>

                    {(owes > 0 || open) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        {owes > 0 && (
                          <span className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 font-bold text-rose-300">
                            <Money value={owes} /> owed
                          </span>
                        )}
                        {open && (
                          <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200">
                            {open}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })
            )}
          </div>

          <div className={TABLE.wrap + " hidden md:block"}>
            <table className={TABLE.table + " min-w-[980px]"}>
              <caption className="sr-only">Unit register</caption>
              <thead>
                <tr>
                  <th className={TABLE.th + " w-11"}>
                    <span className="sr-only">Select</span>
                  </th>
                  <th className={TABLE.th}>Unit</th>
                  <th className={TABLE.th}>Layout</th>
                  <th className={TABLE.thNum}>Sq ft</th>
                  <th className={TABLE.th}>Resident</th>
                  <th className={TABLE.th}>Status</th>
                  <th className={TABLE.thNum}>Owes</th>
                  <th className={TABLE.th}>Open against it</th>
                </tr>
              </thead>
              <tbody>
                {listRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <EmptyState
                        icon="meeting_room"
                        title={totalUnits === 0 ? "No units in this property yet" : "No units match these filters"}
                        hint={
                          totalUnits === 0
                            ? "Add the first unit — tenancies, invoices and tickets all hang off one."
                            : "Try another chip, or clear the search."
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  listRows.map((u) => {
                    const activeLease = u.leases?.find((l: any) => l.status === "Active");
                    const owes = owesByUnit[u.unit_id] ?? 0;
                    const open = openLabel(u.unit_id);
                    const chosen = picked.has(u.unit_id);
                    return (
                      <tr
                        key={u.unit_id}
                        /* The row opens the unit file (DEV-280). */
                        {...rowOpenProps(
                          () => router.push(`/admin/units/${u.unit_id}`),
                          `Open unit ${u.unit_number}`
                        )}
                        className={
                          TABLE.tr + " cursor-pointer" + (chosen ? " bg-primary/[0.06]" : "")
                        }
                      >
                        <td className={TABLE.td}>
                          <input
                            type="checkbox"
                            checked={chosen}
                            onChange={() => togglePick(u.unit_id)}
                            aria-label={`Select unit ${u.unit_number}`}
                            className="h-4 w-4 accent-[#d0bcff]"
                          />
                        </td>
                        <td className={TABLE.td}>
                          {/* The unit number is the link to the unit, the same
                              one an invoice, a ticket or a booking points at. */}
                          <Link
                            href={`/admin/units/${u.unit_id}`}
                            className="whitespace-nowrap border-b border-primary/35 pb-px font-bold text-on-surface hover:text-primary"
                          >
                            {u.unit_number}
                          </Link>
                        </td>
                        <td className={TABLE.tdMuted + " whitespace-nowrap"}>{u.unit_type || "—"}</td>
                        <td className={TABLE.tdNum + " whitespace-nowrap text-on-surface-variant"}>
                          {u.area_sqft ? u.area_sqft.toLocaleString("en-MY") : "—"}
                        </td>
                        <td className={TABLE.tdMuted}>
                          {activeLease?.tenant ? (
                            <Link
                              href={`/admin/leases?tenant=${activeLease.tenant.user_id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {activeLease.tenant.user_name}
                            </Link>
                          ) : (
                            <span className="text-on-surface-variant/50">—</span>
                          )}
                        </td>
                        <td className={TABLE.td}>
                          <StatusBadge status={u.status} variant="unit" />
                        </td>
                        <td className={TABLE.tdNum + " whitespace-nowrap"}>
                          {owes > 0 ? (
                            <Link
                              href={`/admin/invoices?lease=${activeLease?.lease_id ?? ""}`}
                              className="font-bold text-rose-300 hover:underline"
                            >
                              <Money value={owes} />
                            </Link>
                          ) : (
                            <span className="text-on-surface-variant/50">—</span>
                          )}
                        </td>
                        <td className={TABLE.td + " text-[11px] text-on-surface-variant"}>
                          {open ?? <span className="text-on-surface-variant/50">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={view === "floors" ? "space-y-5" : "hidden"}>
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
              className="space-y-4 rounded-xl border border-outline-variant/50 bg-surface-container p-5"
            >
              {/*
                Was a bordered, filled band containing a bordered, filled
                button containing a tinted icon chip — three nested boxes to
                say "Floor 1", inside the section's own box, above a unit card
                that is another box again. Five borders deep for one number.
                It is a heading row now: a chevron, the floor, the count.
              */}
              <header className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFloor(floor)}
                    aria-expanded={!collapsed}
                    aria-controls={panelId}
                    className="pressable -ml-1 flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-container-high"
                  >
                    <span
                      className="material-symbols-outlined text-[20px] leading-none text-on-surface-variant transition-transform"
                      style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                    <h3 className="text-sm font-semibold leading-none text-white">Floor {floor}</h3>
                    <span className="text-[11px] text-on-surface-variant">
                      {floorUnits.length} unit{floorUnits.length === 1 ? "" : "s"}
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
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
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
