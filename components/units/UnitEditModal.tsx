"use client";

import { useActionState, useEffect, useState } from "react";
import { updateUnitAction } from "@/app/admin/units/actions";

interface UnitEditModalProps {
  unit: {
    unit_id: string;
    property_id?: string;
    unit_number: string;
    unit_type: string;
    floor_number: number;
    area_sqft: any;
    monthly_rent?: any;
    status: string;
    leases?: any[];
  } | null;
  properties: { property_id: string; property_name: string }[];
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_TYPES = [
  "Studio",
  "1-Bedroom Suite",
  "2-Bedroom Standard",
  "3-Bedroom Family",
  "Penthouse",
  "Duplex",
  "Retail Lot / Shoplot",
  "Office Suite",
];

export default function UnitEditModal({
  unit,
  properties,
  isOpen,
  onClose,
}: UnitEditModalProps) {
  const [state, formAction, isPending] = useActionState(updateUnitAction, null);
  const [selectedType, setSelectedType] = useState(unit?.unit_type || "2-Bedroom Standard");
  const [selectedStatus, setSelectedStatus] = useState(unit?.status || "Vacant");

  useEffect(() => {
    if (unit) {
      setSelectedType(unit.unit_type || "2-Bedroom Standard");
      setSelectedStatus(unit.status || "Vacant");
    }
  }, [unit]);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!isOpen || !unit) return null;

  const hasActiveLease = unit.leases && unit.leases.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface-container border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Unit Details: {unit.unit_number}</h2>
              <p className="text-xs text-on-surface-variant">Update layout specifications, area sqft, and base rental</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">error</span>
              <span>{state.error}</span>
            </div>
          )}

          {state?.success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              <span>{state.message}</span>
            </div>
          )}

          <form action={formAction} id="edit-unit-form" className="space-y-4">
            <input type="hidden" name="unit_id" value={unit.unit_id} />

            {/* Target Property */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Development Building *</label>
                <span className="text-[11px] text-on-surface-variant">Property assignment</span>
              </div>
              <select
                name="property_id"
                defaultValue={unit.property_id}
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
              >
                {properties.map((p) => (
                  <option key={p.property_id} value={p.property_id} className="bg-surface-container-high text-white">
                    {p.property_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Number & Layout Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Unit Identifier *</label>
                  <span className="text-[11px] text-on-surface-variant">e.g., A-12-03</span>
                </div>
                <input
                  name="unit_number"
                  defaultValue={unit.unit_number}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Unit Layout Type *</label>
                  <span className="text-[11px] text-on-surface-variant">Floor plan</span>
                </div>
                <select
                  name="unit_type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-surface-container-high text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Floor Level & Built-up Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Floor Level *</label>
                  <span className="text-[11px] text-on-surface-variant">Integer floor number</span>
                </div>
                <input
                  name="floor_number"
                  type="number"
                  defaultValue={unit.floor_number}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Built-up Area (Sq Ft) *</label>
                  <span className="text-[11px] text-on-surface-variant">Gross square feet</span>
                </div>
                <input
                  name="area_sqft"
                  type="number"
                  defaultValue={Number(unit.area_sqft)}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Base Rent & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Base Monthly Rent (RM)</label>
                  <span className="text-[11px] text-on-surface-variant">Market baseline rate</span>
                </div>
                <input
                  name="monthly_rent"
                  type="number"
                  defaultValue={Number(unit.monthly_rent || 0)}
                  min="0"
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Operational Status</label>
                  <span className="text-[11px] text-on-surface-variant">Readiness state</span>
                </div>
                <select
                  name="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                >
                  <option value="Vacant" className="bg-surface-container-high text-white">Vacant (Available)</option>
                  <option value="Occupied" disabled={!hasActiveLease} className="bg-surface-container-high text-white">
                    Occupied {hasActiveLease ? "(Leased)" : "(Requires Active Lease)"}
                  </option>
                  <option value="Repair" className="bg-surface-container-high text-white">Under Maintenance / Repair</option>
                  <option value="Not Available" className="bg-surface-container-high text-white">Not Available</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/40 bg-surface-container-high/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant border border-outline-variant/60 text-xs font-semibold text-on-surface-variant hover:text-white transition-all pressable"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-unit-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Saving Unit...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
