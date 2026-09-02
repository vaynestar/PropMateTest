"use client";

import { useActionState, useEffect } from "react";
import { adminUpdateLease } from "@/app/admin/leases/actions";

interface AdminLeaseEditModalProps {
  lease: {
    lease_id: string;
    move_in_date: any;
    move_out_date: any;
    status: string;
    unit: {
      unit_number: string;
      property?: { property_name: string };
    };
    tenant: {
      user_name: string;
      user_email: string;
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLeaseEditModal({
  lease,
  isOpen,
  onClose,
}: AdminLeaseEditModalProps) {
  const [state, formAction, isPending] = useActionState(adminUpdateLease, null);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!isOpen || !lease) return null;

  const formattedMoveIn = lease.move_in_date
    ? new Date(lease.move_in_date).toISOString().split("T")[0]
    : "";
  const formattedMoveOut = lease.move_out_date
    ? new Date(lease.move_out_date).toISOString().split("T")[0]
    : "";

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
              <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Lease Terms: Unit {lease.unit.unit_number}</h2>
              <p className="text-xs text-on-surface-variant">Update move-in / move-out dates or terminate tenancy</p>
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
              <span>Lease updated successfully!</span>
            </div>
          )}

          {/* Readonly Summary Info */}
          <div className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Resident</span>
              <span className="font-semibold text-white">{lease.tenant.user_name}</span>
              <span className="text-on-surface-variant/80 block text-[11px] truncate">{lease.tenant.user_email}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">Unit & Development</span>
              <span className="font-semibold text-white">{lease.unit.unit_number}</span>
              <span className="text-on-surface-variant/80 block text-[11px]">{lease.unit.property?.property_name || "Strata Unit"}</span>
            </div>
          </div>

          <form action={formAction} id="edit-lease-form" className="space-y-4">
            <input type="hidden" name="lease_id" value={lease.lease_id} />

            {/* Dates: Move-In and Move-Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Move-In Date *</label>
                  <span className="text-[11px] text-on-surface-variant">Effective start</span>
                </div>
                <input
                  name="move_in_date"
                  type="date"
                  defaultValue={formattedMoveIn}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all [color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Move-Out Date</label>
                  <span className="text-[11px] text-on-surface-variant">Tenancy termination</span>
                </div>
                <input
                  name="move_out_date"
                  type="date"
                  defaultValue={formattedMoveOut}
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 text-xs text-on-surface-variant">
              <span className="font-semibold text-white">Termination Rule:</span> Setting a valid Move-Out Date will automatically mark this tenancy agreement as <strong className="text-amber-300">Inactive / Terminated</strong> and free up the unit inventory back to <strong className="text-violet-300">Vacant</strong>.
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
            form="edit-lease-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Updating Terms...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Lease Terms</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
