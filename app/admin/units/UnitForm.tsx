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

      <form action={formAction} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <select
          name="property_id"
          defaultValue={activePropertyId || ""}
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
        >
          <option value="">Select property</option>
          {properties.map((property) => (
            <option
              key={property.property_id}
              value={property.property_id}
            >
              {property.property_name} ({property.property_type})
            </option>
          ))}
        </select>

        <input
          name="unit_number"
          placeholder="Unit No. (e.g., A-12-03)"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />

        <input
          name="unit_type"
          placeholder="Type (e.g., Condominium)"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />

        <input
          name="floor_number"
          type="number"
          placeholder="Floor No."
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />

        <input
          name="area_sqft"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Area (sqft)"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />

        <input
          name="monthly_rent"
          type="number"
          step="0.01"
          min="0"
          placeholder="Monthly rent (MYR)"
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />

        <select
          name="status"
          defaultValue="Vacant"
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
        >
          <option value="Vacant">Vacant</option>
          <option value="Occupied">Occupied</option>
          <option value="Reserved">Reserved</option>
          <option value="Maintenance">Maintenance</option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 lg:col-span-3 transition-all disabled:opacity-50 pressable"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin-slow" style={{ fontSize: 18 }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          )}
          {isPending ? "Adding Unit..." : "Add Unit"}
        </button>
      </form>
    </div>
  );
}
