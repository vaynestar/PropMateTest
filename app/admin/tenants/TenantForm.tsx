"use client";

import { useActionState, useEffect, useState } from "react";
import { addTenant } from "./actions";

export default function TenantForm() {
  const [state, formAction, isPending] = useActionState(addTenant, null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      const t = setTimeout(() => setIsSuccess(false), 5000);
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
        <input
          name="user_name"
          placeholder="Full Name (e.g., John Doe)"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary lg:col-span-1"
        />

        <input
          name="user_email"
          type="email"
          placeholder="Email Address"
          required
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary lg:col-span-1"
        />

        <input
          name="phone_number"
          type="tel"
          placeholder="Phone Number (Optional)"
          className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary lg:col-span-1"
        />

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 lg:col-span-3 transition-all disabled:opacity-50 pressable"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin-slow" style={{ fontSize: 18 }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
          )}
          {isPending ? "Adding Tenant..." : "Add Tenant"}
        </button>
      </form>
    </div>
  );
}
