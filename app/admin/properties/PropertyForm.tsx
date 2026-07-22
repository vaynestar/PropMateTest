"use client";

import { useActionState, useEffect, useState } from "react";
import { addProperty } from "./actions";

export default function PropertyForm() {
  const [state, formAction, isPending] = useActionState(addProperty, null);
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
          {state.message}
        </div>
      )}

      {state?.error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {state.error}
        </div>
      )}

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input
          name="property_name"
          placeholder="Property name (e.g., Desa Harmoni)"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />
        <input
          name="property_type"
          placeholder="Type (Condominium / Apartment)"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />
        <input
          name="address"
          placeholder="Street address"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary md:col-span-2"
        />
        <input
          name="city"
          placeholder="City"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />
        <input
          name="state"
          placeholder="State"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />
        <input
          name="country"
          placeholder="Country"
          defaultValue="Malaysia"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />
        <input
          name="postal_code"
          placeholder="Postal code"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 md:col-span-2 transition-all disabled:opacity-50 pressable"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin-slow" style={{ fontSize: 18 }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          )}
          {isPending ? "Adding Property..." : "Add Property"}
        </button>
      </form>
    </div>
  );
}
