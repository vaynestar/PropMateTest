"use client";

import { useActionState, useEffect, useState } from "react";
import { removeProperty } from "./actions";

export default function PropertyDeleteForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, isPending] = useActionState(removeProperty, null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state?.error) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex-1 relative">
      <input type="hidden" name="property_id" value={propertyId} />
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50 pressable"
      >
        {isPending ? (
          <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
        ) : null}
        {isPending ? "Deleting..." : "Delete"}
      </button>

      {/* Floating Error Toast for Delete */}
      {showError && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 rounded bg-rose-500 text-white text-xs shadow-lg animate-fade-in z-10 whitespace-nowrap">
          {state.error}
        </div>
      )}
    </form>
  );
}
