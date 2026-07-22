"use client";

import { useActionState, useState, useEffect } from "react";
import { adminUpdateLease } from "./actions";

type Lease = {
  lease_id: string;
  move_in_date: Date | string | null;
  move_out_date: Date | string | null;
  status: string | null;
  tenant: {
    user_name: string;
    user_email: string;
  };
  unit: {
    unit_number: string;
    property: {
      property_name: string;
    };
  };
};

export default function AdminLeaseEditForm({ lease }: { lease: Lease }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(adminUpdateLease, null);

  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
    }
  }, [state]);

  const formattedMoveIn = lease.move_in_date
    ? new Date(lease.move_in_date).toISOString().split("T")[0]
    : "";

  const formattedMoveOut = lease.move_out_date
    ? new Date(lease.move_out_date).toISOString().split("T")[0]
    : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full btn-outline py-2 flex items-center justify-center gap-1.5 text-xs hover:border-primary transition-colors pressable"
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
        Edit Lease Info
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !pending && setIsOpen(false)}
          />
          <div className="glass-card relative w-full max-w-lg rounded-xl overflow-hidden animate-slide-in">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
              <div>
                <h2 className="font-title-lg text-title-lg text-on-surface">Edit Lease Details</h2>
                <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                  {lease.unit.property.property_name} — Unit {lease.unit.unit_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={pending}
                className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              <form action={formAction} className="flex flex-col gap-5">
                <input type="hidden" name="lease_id" value={lease.lease_id} />

                {/* Tenant Read-only info */}
                <div className="p-3 bg-surface-container rounded-lg border border-outline-variant/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-on-surface-variant">Resident Tenant</p>
                    <p className="font-semibold text-on-surface text-sm">{lease.tenant.user_name}</p>
                    <p className="text-xs text-on-surface-variant/80">{lease.tenant.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-on-surface-variant">Current Status</p>
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary mt-1">
                      {lease.status || "Active"}
                    </span>
                  </div>
                </div>

                {/* Move-in Date */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`move_in_date-${lease.lease_id}`} className="font-label-md text-label-md text-on-surface-variant">
                    Move-in Date <span className="text-error">*</span>
                  </label>
                  <input
                    id={`move_in_date-${lease.lease_id}`}
                    name="move_in_date"
                    type="date"
                    required
                    defaultValue={formattedMoveIn}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* Move-out Date */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`move_out_date-${lease.lease_id}`} className="font-label-md text-label-md text-on-surface-variant">
                      Move-out Date (Optional)
                    </label>
                    <span className="text-[11px] text-primary-fixed">Auto Status Trigger</span>
                  </div>
                  <input
                    id={`move_out_date-${lease.lease_id}`}
                    name="move_out_date"
                    type="date"
                    defaultValue={formattedMoveOut}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-on-surface-variant/70 mt-1 leading-relaxed">
                    💡 <strong>Status Logic:</strong> Adding a Move-out date automatically updates status to <strong className="text-amber-400">Inactive</strong> and frees the unit. Clearing the Move-out date restores status to <strong className="text-emerald-400">Active</strong>.
                  </p>
                </div>

                {state?.error && (
                  <div className="p-3 bg-error-container/20 border border-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    {state.error}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-3 pt-4 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={pending}
                    className="px-4 py-2 font-label-md font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="px-5 py-2.5 bg-primary text-on-primary font-label-md font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {pending && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                    Save Lease Info
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
