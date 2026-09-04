"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import UnitFormModal from "./UnitFormModal";
import UnitEditModal from "./UnitEditModal";
import UnitDeleteModal from "./UnitDeleteModal";
import { updateUnitStatusAction } from "@/app/admin/units/actions";
import { useActionState } from "react";
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
}

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
  onSelect: (next: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(updateUnitStatusAction, null);
  const isLeased = !!unit.leases && unit.leases.length > 0;
  const meta = unitStatus(status);

  // If the server rejects the change, fall back to the persisted value.
  useEffect(() => {
    if (state?.error) onSelect(unit.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="relative shrink-0">
      <input type="hidden" name="unit_id" value={unit.unit_id} />
      <select
        // Remount when the status changes. React's controlled-<select> value
        // tracker can hold a stale node value after a change event, which is
        // what made the label keep saying "Vacant" while the colour updated.
        // Keying on the value sidesteps the tracker entirely.
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
      ) : (
        <span
          className="material-symbols-outlined pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[14px] opacity-70"
          aria-hidden="true"
        >
          expand_more
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

/** Occupancy meter for a floor. Shows real proportions, not decoration. */
function FloorMeter({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return null;
  const segments = UNIT_STATUS_ORDER.filter((k) => counts[k] > 0);
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
      {segments.map((k) => (
        <div
          key={k}
          className={UNIT_STATUSES[k].rail}
          style={{ width: `${(counts[k] / total) * 100}%` }}
          title={`${counts[k]} ${UNIT_STATUSES[k].label}`}
        />
      ))}
    </div>
  );
}

/**
 * One unit. Holds the optimistic status so the rail, the control and the
 * supporting copy all move together the instant the user picks a new state —
 * previously the colour and the label were driven by two different sources and
 * visibly disagreed while the server round-trip completed.
 */
function UnitCard({
  unit,
  onEdit,
  onDelete,
}: {
  unit: UnitItem;
  onEdit: (u: UnitItem) => void;
  onDelete: (u: UnitItem) => void;
}) {
  const [status, setStatus] = useState(unit.status);
  useEffect(() => setStatus(unit.status), [unit.status]);

  const activeLease = unit.leases?.[0];
  const tenant = activeLease?.tenant;
  const meta = unitStatus(status);

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
          <InlineStatusSelector unit={unit} status={status} onSelect={setStatus} />
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
        ) : (
          <p className="mt-3 rounded-md border border-dashed border-outline-variant/40 p-2.5 text-[11px] text-on-surface-variant">
            {status === "Repair"
              ? "Out of service — no tenant assigned."
              : status === "Not Available"
              ? "Held off the market."
              : "No tenant yet."}
          </p>
        )}
      </div>

      {/* Edit and Delete are a matched labelled pair — delete used to be an
          unlabelled 24px icon. The forward action sits right, where the eye ends. */}
      <div className="flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(unit)}
            className="pressable flex items-center gap-1 rounded-md border border-outline-variant/60 bg-surface-container px-2.5 py-1.5 text-[11px] font-semibold text-on-surface transition-colors hover:bg-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              edit
            </span>
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(unit)}
            className="pressable flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
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
  activePropertyId: initialActiveProp,
}: UnitsClientProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialActiveProp || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<UnitItem | null>(null);

  const filteredUnits = useMemo(() => {
    return initialUnits.filter((u) => {
      const matchesProperty =
        selectedPropertyId === "ALL" || u.property_id === selectedPropertyId;

      const matchesStatus =
        statusFilter === "ALL" || u.status.toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const activeTenant = u.leases?.[0]?.tenant;
      const matchesSearch =
        !q ||
        u.unit_number.toLowerCase().includes(q) ||
        u.unit_type.toLowerCase().includes(q) ||
        u.floor_number.toString().includes(q) ||
        (activeTenant &&
          (activeTenant.user_name.toLowerCase().includes(q) ||
            activeTenant.user_email.toLowerCase().includes(q)));

      return matchesProperty && matchesStatus && matchesSearch;
    });
  }, [initialUnits, selectedPropertyId, statusFilter, searchQuery]);

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

  // Counts are scoped to the selected property so the figures match what is on screen.
  const scopedUnits = useMemo(
    () =>
      selectedPropertyId === "ALL"
        ? initialUnits
        : initialUnits.filter((u) => u.property_id === selectedPropertyId),
    [initialUnits, selectedPropertyId]
  );

  const countOf = (key: UnitStatusKey) => scopedUnits.filter((u) => u.status === key).length;
  const totalUnits = scopedUnits.length;
  const occupiedUnits = countOf("Occupied");
  const vacantUnits = countOf("Vacant");
  const repairUnits = countOf("Repair");
  const reservedUnits = countOf("Not Available");
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const kpis = [
    {
      label: "Total units",
      value: totalUnits,
      detail:
        selectedPropertyId === "ALL"
          ? `Across ${properties.length} propert${properties.length === 1 ? "y" : "ies"}`
          : "In this property",
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

  // The filter row doubles as the colour legend: every chip carries its status
  // dot whether or not it is active, plus a live count. No separate legend
  // strip needed — the control and the key are the same object.
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

  return (
    <div className="space-y-6">
      {/* Summary. Sentence-case labels, and each figure carries its status colour
          so the palette is learned here and reused on every card below. */}
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

      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 bg-surface-container p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center xl:max-w-xl">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            aria-label="Filter by property"
            className="shrink-0 rounded-lg border border-outline-variant/60 bg-surface-container-high px-3 py-2 text-xs text-white outline-none focus:border-primary"
          >
            <option value="ALL">All properties</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
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
              placeholder="Search unit number, layout or tenant"
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-high py-2 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary"
            />
          </div>
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

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="pressable flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-md transition-colors hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            <span>Add unit</span>
          </button>
        </div>
      </div>

      {/* Units, grouped by floor */}
      <div className="space-y-5">
        {unitsByFloor.map(({ floor, units }) => {
          const counts = UNIT_STATUS_ORDER.reduce<Record<string, number>>((acc, k) => {
            acc[k] = units.filter((u) => u.status === k).length;
            return acc;
          }, {});

          return (
            <section
              key={floor}
              className="space-y-4 rounded-xl border border-outline-variant/60 bg-surface-container p-5"
            >
              <header className="space-y-2.5 border-b border-outline-variant/30 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-outline-variant/40 bg-surface-container-high text-xs font-bold text-primary">
                      {floor}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Floor {floor}</h3>
                      <span className="text-[11px] text-on-surface-variant">
                        {units.length} unit{units.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
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

                <FloorMeter counts={counts} total={units.length} />
              </header>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {units.map((unit) => (
                  <UnitCard
                    key={unit.unit_id}
                    unit={unit}
                    onEdit={setEditingUnit}
                    onDelete={setDeletingUnit}
                  />
                ))}
              </div>
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
              <h4 className="text-sm font-bold text-white">
                {searchQuery || statusFilter !== "ALL" || selectedPropertyId !== "ALL"
                  ? "No units match these filters"
                  : "No units yet"}
              </h4>
              <p className="mt-1 text-xs text-on-surface-variant">
                {searchQuery || statusFilter !== "ALL" || selectedPropertyId !== "ALL"
                  ? "Clear the filters to see the full list."
                  : "Add the first unit to start tracking occupancy."}
              </p>
            </div>
            {searchQuery || statusFilter !== "ALL" || selectedPropertyId !== "ALL" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setSelectedPropertyId("ALL");
                }}
                className="pressable rounded-lg border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="pressable rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90"
              >
                Add unit
              </button>
            )}
          </div>
        )}
      </div>

      <UnitFormModal
        properties={properties}
        activePropertyId={selectedPropertyId !== "ALL" ? selectedPropertyId : undefined}
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
