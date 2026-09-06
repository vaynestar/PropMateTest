"use client";

import { useActionState, useEffect, useState } from "react";
import { adminCreateLease } from "@/app/admin/leases/actions";

interface AdminLeaseFormModalProps {
  units: {
    unit_id: string;
    unit_number: string;
    status: string;
    property?: { property_name: string };
  }[];
  users: {
    user_id: string;
    user_name: string;
    user_email: string;
  }[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLeaseFormModal({
  units,
  users,
  isOpen,
  onClose,
}: AdminLeaseFormModalProps) {
  const [state, formAction, isPending] = useActionState(adminCreateLease, null);
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.unit_id || "");

  // Only vacant units can take a new lease — createLease() rejects anything
  // else, so offering occupied units just produced an error after submitting.
  const vacantUnits = units.filter((u) => u.status === "Vacant");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.user_id || "");

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
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">contract_edit</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">New lease</h2>
              <p className="text-xs text-on-surface-variant">Put a tenant in a unit. Billing starts from the move-in date.</p>
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

        {/* Body */}
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
              <span>Lease created. The unit is now marked Occupied — set up its charges next.</span>
            </div>
          )}

          <form action={formAction} id="create-lease-form" className="space-y-4">
            {/* Target Unit */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Unit</label>
                <span className="text-[11px] text-on-surface-variant">Vacant units only</span>
              </div>
              <select
                name="unit_id"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
              >
                {vacantUnits.length === 0 && (
                  <option value="">No vacant units in this property</option>
                )}
                {vacantUnits.map((u) => (
                  <option key={u.unit_id} value={u.unit_id} className="bg-surface-container-high text-white">
                    {u.unit_number}
                    {u.property ? ` (${u.property.property_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Tenant */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Tenant</label>
                <span className="text-[11px] text-on-surface-variant">Add them first if missing</span>
              </div>
              <select
                name="user_id"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id} className="bg-surface-container-high text-white">
                    {u.user_name} ({u.user_email})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates: Move-In and Move-Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Move-in</label>
                  <span className="text-[11px] text-on-surface-variant">Billing starts here</span>
                </div>
                <input
                  name="move_in_date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Move-out</label>
                  <span className="text-[11px] text-on-surface-variant">Leave blank if open-ended</span>
                </div>
                <input
                  name="move_out_date"
                  type="date"
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 text-xs text-on-surface-variant">
              Saving marks the unit <strong className="text-emerald-300">Occupied</strong>. Rent and other
              recurring charges are set up afterwards, under Charges &amp; Billing on the lease.
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
            form="create-lease-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Creating Agreement...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Create Lease</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
