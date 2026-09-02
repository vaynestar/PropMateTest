"use client";

import { useActionState, useEffect, useState } from "react";
import { addUnit } from "@/app/admin/units/actions";

interface UnitFormModalProps {
  properties: { property_id: string; property_name: string }[];
  activePropertyId?: string | null;
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

export default function UnitFormModal({
  properties,
  activePropertyId,
  isOpen,
  onClose,
}: UnitFormModalProps) {
  const [state, formAction, isPending] = useActionState(addUnit, null);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [selectedPropertyId, setSelectedPropertyId] = useState(activePropertyId || properties[0]?.property_id || "");

  useEffect(() => {
    if (activePropertyId) {
      setSelectedPropertyId(activePropertyId);
    }
  }, [activePropertyId]);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface-container border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-[20px]">meeting_room</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Units to Inventory</h2>
              <p className="text-xs text-on-surface-variant">Register individual units or batch-generate floor inventory</p>
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-surface-container-high/80 p-1 border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "single"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Single Unit</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                mode === "bulk"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">dynamic_feed</span>
              <span>Batch Generate</span>
            </button>
          </div>

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

          <form action={formAction} id="add-unit-form" className="space-y-4">
            <input type="hidden" name="creation_mode" value={mode} />

            {/* Target Property */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Target Development *</label>
                <span className="text-[11px] text-on-surface-variant">Property building assignment</span>
              </div>
              <select
                name="property_id"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
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

            {/* Mode-Specific Unit Identifiers */}
            {mode === "single" ? (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Unit Number *</label>
                  <span className="text-[11px] text-on-surface-variant">e.g., A-12-03, B-08</span>
                </div>
                <input
                  name="unit_number"
                  placeholder="e.g., A-12-03"
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-container-high/40 border border-outline-variant/40">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">Prefix</label>
                  <input
                    name="unit_prefix"
                    placeholder="e.g., A-12-"
                    className="w-full rounded-xl bg-surface-container border border-outline-variant/60 px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant block">e.g., Floor prefix</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">Start # *</label>
                  <input
                    name="start_number"
                    type="number"
                    defaultValue="1"
                    min="1"
                    required
                    className="w-full rounded-xl bg-surface-container border border-outline-variant/60 px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant block">First unit index</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white">End # *</label>
                  <input
                    name="end_number"
                    type="number"
                    defaultValue="12"
                    min="1"
                    required
                    className="w-full rounded-xl bg-surface-container border border-outline-variant/60 px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant block">Last unit index</span>
                </div>
              </div>
            )}

            {/* Layout Type & Floor Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Unit Layout Type *</label>
                  <span className="text-[11px] text-on-surface-variant">Floor plan</span>
                </div>
                <select
                  name="unit_type"
                  defaultValue="2-Bedroom Standard"
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-surface-container-high text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Floor Level *</label>
                  <span className="text-[11px] text-on-surface-variant">Integer floor #</span>
                </div>
                <input
                  name="floor_number"
                  type="number"
                  defaultValue="1"
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Built-up Area & Base Rent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Built-up Area (Sq Ft) *</label>
                  <span className="text-[11px] text-on-surface-variant">Gross square feet</span>
                </div>
                <input
                  name="area_sqft"
                  type="number"
                  defaultValue="850"
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Base Monthly Rent (RM)</label>
                  <span className="text-[11px] text-on-surface-variant">Reference rental rate</span>
                </div>
                <input
                  name="monthly_rent"
                  type="number"
                  defaultValue="0"
                  min="0"
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Initial Status */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Initial Operational Status</label>
                <span className="text-[11px] text-on-surface-variant">Occupancy readiness</span>
              </div>
              <select
                name="status"
                defaultValue="Vacant"
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
              >
                <option value="Vacant" className="bg-surface-container-high text-white">Vacant (Available for Lease)</option>
                <option value="Repair" className="bg-surface-container-high text-white">Under Maintenance / Inspection</option>
                <option value="Not Available" className="bg-surface-container-high text-white">Not Available (Reserved)</option>
              </select>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
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
            form="add-unit-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Adding Unit(s)...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">meeting_room</span>
                <span>{mode === "single" ? "Add Unit" : "Generate Units"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
