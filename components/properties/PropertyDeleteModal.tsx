"use client";

import { useActionState, useEffect } from "react";
import { removeProperty } from "@/app/admin/properties/actions";

interface PropertyDeleteModalProps {
  property: {
    property_id: string;
    property_name: string;
    _count?: { units?: number };
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertyDeleteModal({ property, isOpen, onClose }: PropertyDeleteModalProps) {
  const [state, formAction, isPending] = useActionState(removeProperty, null);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!isOpen || !property) return null;

  const unitCount = property._count?.units || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-surface-container border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between bg-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Delete Property</h2>
              <p className="text-[11px] text-rose-300/80">Permanent removal of strata record</p>
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

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">error</span>
              <span>{state.error}</span>
            </div>
          )}

          <p className="text-on-surface-variant leading-relaxed">
            Are you sure you want to delete <strong className="text-white font-semibold">{property.property_name}</strong>?
          </p>

          {unitCount > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">warning</span>
              <div>
                <strong className="font-semibold block">Warning: Active Units Detected</strong>
                <span>This property has {unitCount} registered unit(s). Deleting the property will fail if active units or leases remain attached.</span>
              </div>
            </div>
          ) : (
            <p className="text-on-surface-variant/80 text-[11px]">
              This action cannot be undone. All configuration associated with this development will be erased.
            </p>
          )}

          <form action={formAction} id="delete-property-form">
            <input type="hidden" name="property_id" value={property.property_id} />
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
            form="delete-property-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
