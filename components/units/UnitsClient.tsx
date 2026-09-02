"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";
import UnitFormModal from "./UnitFormModal";
import UnitEditModal from "./UnitEditModal";
import UnitDeleteModal from "./UnitDeleteModal";
import { updateUnitStatusAction } from "@/app/admin/units/actions";
import { useActionState } from "react";

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

function InlineStatusSelector({ unit }: { unit: UnitItem }) {
  const [state, formAction, isPending] = useActionState(updateUnitStatusAction, null);
  const isLeased = unit.leases && unit.leases.length > 0;

  return (
    <form action={formAction} className="relative inline-block">
      <input type="hidden" name="unit_id" value={unit.unit_id} />
      <select
        name="status"
        value={unit.status}
        onChange={(e) => e.target.form?.requestSubmit()}
        disabled={isPending}
        className="text-[11px] font-semibold bg-surface-container-high border border-outline-variant/60 rounded-lg px-2 py-1 text-on-surface outline-none focus:border-primary cursor-pointer disabled:opacity-50 transition-colors"
      >
        <option value="Vacant" className="bg-surface-container text-white">Vacant</option>
        <option value="Occupied" disabled={!isLeased} className="bg-surface-container text-white">
          Occupied {isLeased ? "" : "(Needs Lease)"}
        </option>
        <option value="Repair" className="bg-surface-container text-white">Repair</option>
        <option value="Not Available" className="bg-surface-container text-white">Reserved</option>
      </select>
      {isPending && (
        <span className="material-symbols-outlined animate-spin-slow text-[12px] text-primary absolute -top-1 -right-1">
          progress_activity
        </span>
      )}
    </form>
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

  // Filtered Units
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
        (activeTenant && (activeTenant.user_name.toLowerCase().includes(q) || activeTenant.user_email.toLowerCase().includes(q)));

      return matchesProperty && matchesStatus && matchesSearch;
    });
  }, [initialUnits, selectedPropertyId, statusFilter, searchQuery]);

  // Group by floor
  const unitsByFloor = useMemo(() => {
    const map = new Map<number, UnitItem[]>();
    for (const u of filteredUnits) {
      if (!map.has(u.floor_number)) {
        map.set(u.floor_number, []);
      }
      map.get(u.floor_number)!.push(u);
    }
    // Sort descending by floor
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, floorUnits]) => ({
        floor,
        units: floorUnits.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true })),
      }));
  }, [filteredUnits]);

  // Aggregate stats
  const totalUnits = initialUnits.length;
  const occupiedUnits = initialUnits.filter((u) => u.status === "Occupied").length;
  const vacantUnits = initialUnits.filter((u) => u.status === "Vacant").length;
  const repairUnits = initialUnits.filter((u) => u.status === "Repair" || u.status === "Not Available").length;
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Units
            </span>
            <div className="text-2xl font-bold text-white mt-1">{totalUnits}</div>
            <span className="text-[11px] text-cyan-400 font-medium">In Portfolio</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-[24px]">meeting_room</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Occupancy Rate
            </span>
            <div className="text-2xl font-bold text-white mt-1">{occupancyPct}%</div>
            <span className="text-[11px] text-emerald-400 font-medium">{occupiedUnits} Leased Units</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Vacant Units
            </span>
            <div className="text-2xl font-bold text-white mt-1">{vacantUnits}</div>
            <span className="text-[11px] text-violet-400 font-medium">Ready to Lease</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">key</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Maintenance / Offline
            </span>
            <div className="text-2xl font-bold text-white mt-1">{repairUnits}</div>
            <span className="text-[11px] text-amber-400 font-medium">Under Inspection</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-[24px]">build</span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Property Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          {/* Property Dropdown */}
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant/60 text-xs text-white outline-none focus:border-primary shrink-0"
          >
            <option value="ALL">All Properties ({totalUnits})</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by unit #, layout, or tenant..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant/60 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Status Pills & Add Button */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 bg-surface-container-high/60 p-1 rounded-xl border border-outline-variant/40">
            {["ALL", "Vacant", "Occupied", "Repair"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                {st === "ALL" ? "All Status" : st}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* Floor-Grouped Units List */}
      <div className="space-y-6">
        {unitsByFloor.map(({ floor, units }) => (
          <div key={floor} className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-4">
            {/* Floor Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-xs text-primary border border-outline-variant/40">
                  L{floor}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Floor {floor}</h3>
                  <span className="text-[11px] text-on-surface-variant">
                    {units.length} unit{units.length === 1 ? "" : "s"} on this level
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-medium">
                  {units.filter((u) => u.status === "Occupied").length} Occupied
                </span>
                <span>•</span>
                <span className="text-violet-400 font-medium">
                  {units.filter((u) => u.status === "Vacant").length} Vacant
                </span>
              </div>
            </div>

            {/* Units Cards Grid on this Floor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {units.map((unit) => {
                const activeLease = unit.leases?.[0];
                const tenant = activeLease?.tenant;

                return (
                  <div
                    key={unit.unit_id}
                    className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/50 hover:border-primary/50 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      {/* Top Row: Unit # and Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                            {unit.unit_number}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-on-surface-variant">
                            {unit.unit_type}
                          </span>
                        </div>
                        <InlineStatusSelector unit={unit} />
                      </div>

                      {/* Specs Row */}
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant/80">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">straighten</span>
                          {Number(unit.area_sqft)} sqft
                        </span>
                        <span>•</span>
                        <span>RM {Number(unit.monthly_rent || 0).toLocaleString()}/mo</span>
                      </div>

                      {/* Tenant Row if Occupied */}
                      {tenant && (
                        <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-300 truncate">
                              {tenant.user_name}
                            </span>
                            <Link
                              href={`/admin/leases?unit=${encodeURIComponent(unit.unit_number)}`}
                              className="text-[10px] text-emerald-400 hover:underline font-mono"
                            >
                              Lease
                            </Link>
                          </div>
                          <span className="text-[11px] text-on-surface-variant truncate block">
                            {tenant.user_email}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingUnit(unit)}
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface hover:text-white border border-outline-variant/40 text-[11px] font-semibold transition-all pressable flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingUnit(unit)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[11px] transition-all pressable"
                          title="Delete Unit"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>

                      {unit.status === "Vacant" ? (
                        <Link
                          href={`/admin/leases`}
                          className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <span>Create Lease</span>
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </Link>
                      ) : activeLease ? (
                        <Link
                          href={`/admin/leases/${activeLease.lease_id}/charges`}
                          className="text-[11px] text-cyan-400 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <span>Billing</span>
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {unitsByFloor.length === 0 && (
          <div className="py-16 text-center rounded-2xl bg-surface-container border border-outline-variant/40 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px] opacity-40">meeting_room</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No Units Found</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {searchQuery || statusFilter !== "ALL" || selectedPropertyId !== "ALL"
                  ? "No units match your search filters."
                  : "Start populating your property by adding units."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
