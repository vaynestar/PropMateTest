"use client";

import { useActionState, useEffect, useState } from "react";
import { addUnit } from "./actions";

type Property = {
  property_id: string;
  property_name: string;
  property_type: string;
};

export default function UnitForm({
  properties,
  activePropertyId,
}: {
  properties: Property[];
  activePropertyId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(addUnit, null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      const t = setTimeout(() => setIsSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const [mode, setMode] = useState<"single" | "batch">("single");

  return (
    <div className="relative">
      {isSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-slide-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {state?.message}
        </div>
      )}

      {state?.error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {state?.error}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="creation_mode" value={mode} />
        
        {/* Creation Mode Toggle */}
        <div className="flex items-center gap-6 p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/50">
          <h3 className="text-sm font-semibold text-on-surface w-32">Creation Mode:</h3>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" 
              name="mode_radio" 
              value="single" 
              checked={mode === "single"} 
              onChange={() => setMode("single")}
              className="w-4 h-4 text-primary bg-surface-container-high border-outline-variant focus:ring-primary focus:ring-2"
            />
            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">Single Unit</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" 
              name="mode_radio" 
              value="batch" 
              checked={mode === "batch"} 
              onChange={() => setMode("batch")}
              className="w-4 h-4 text-primary bg-surface-container-high border-outline-variant focus:ring-primary focus:ring-2"
            />
            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">Batch Generation</span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          
          <div className="space-y-1 lg:col-span-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Property</label>
            <select
              name="property_id"
              defaultValue={activePropertyId || ""}
              required
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.property_id} value={property.property_id}>
                  {property.property_name} ({property.property_type})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 lg:col-span-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Floor Number</label>
            <input
              name="floor_number"
              type="number"
              placeholder="e.g. 12"
              required
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1 lg:col-span-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Unit Type (Optional)</label>
            <input
              name="unit_type"
              placeholder="e.g. Condominium"
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
            />
          </div>

        </div>

        {/* Dynamic Unit Number Section */}
        {mode === "single" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/50">
            <div className="space-y-1 lg:col-span-1">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Unit Number</label>
              <input
                name="unit_number"
                placeholder="e.g. A-12-03"
                required={mode === "single"}
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/50">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Unit Prefix</label>
              <input
                name="unit_prefix"
                placeholder="e.g. A-12-"
                required={mode === "batch"}
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Start Number</label>
              <input
                name="start_number"
                type="text"
                placeholder="e.g. 01"
                required={mode === "batch"}
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">End Number</label>
              <input
                name="end_number"
                type="text"
                placeholder="e.g. 10"
                required={mode === "batch"}
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary font-mono"
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 lg:col-span-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Area (sqft)</label>
            <input
              name="area_sqft"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 1200"
              required
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1 lg:col-span-1">
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</label>
            <select
              name="status"
              defaultValue="Vacant"
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
            >
              <option value="Vacant">Vacant</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full md:w-auto px-8 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 pressable"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin-slow" style={{ fontSize: 18 }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_box</span>
          )}
          {isPending 
            ? (mode === "single" ? "Adding Unit..." : "Generating Units...") 
            : (mode === "single" ? "Add Unit" : "Generate Units")}
        </button>
      </form>
    </div>
  );
}
