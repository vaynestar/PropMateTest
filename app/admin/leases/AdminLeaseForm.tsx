"use client";

import { useActionState, useEffect, useState } from "react";
import { adminCreateLease } from "./actions";

export default function AdminLeaseForm({ 
  units, 
  users 
}: { 
  units: any[], 
  users: any[] 
}) {
  const [state, formAction, isPending] = useActionState(adminCreateLease, null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
  }, [state]);

  const vacantUnits = units.filter(u => u.status !== "Occupied");
  const residentUsers = users.filter(u => u.role === "Resident");

  return (
    <div className="bg-surface-container border border-[#4a4455] rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      {isSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-slide-in">
          <span className="material-symbols-outlined">check_circle</span>
          Lease successfully created.
        </div>
      )}

      {state?.error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {state?.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="space-y-1">
            <label htmlFor="user_id" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Tenant (Resident)
            </label>
            <select
              id="user_id"
              name="user_id"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
            >
              <option value="">Select Tenant...</option>
              {residentUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_name} ({u.user_email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="unit_id" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Vacant Unit
            </label>
            <select
              id="unit_id"
              name="unit_id"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
            >
              <option value="">Select Unit...</option>
              {vacantUnits.map((u) => (
                <option key={u.unit_id} value={u.unit_id}>
                  {u.property.property_name} - Unit {u.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="move_in_date" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Move-in Date
            </label>
            <input
              type="date"
              id="move_in_date"
              name="move_in_date"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="move_out_date" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Move-out Date (Optional)
            </label>
            <input
              type="date"
              id="move_out_date"
              name="move_out_date"
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="gradient-btn px-6 py-2.5 rounded-lg font-medium text-white shadow-lg flex items-center gap-2 disabled:opacity-50 pressable"
          >
            {isPending ? (
              <span className="material-symbols-outlined animate-spin-slow">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">description</span>
            )}
            {isPending ? "Creating..." : "Create Lease"}
          </button>
        </div>
      </form>
    </div>
  );
}
