"use client";

import { useActionState, useEffect, useState } from "react";
import { removeTenant } from "./actions";

export default function TenantDeleteForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(removeTenant, null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state?.error) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="relative mt-2 pt-2 border-t border-outline-variant/30 flex justify-end">
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1 disabled:opacity-50 pressable"
      >
        {isPending ? (
          <span className="material-symbols-outlined animate-spin-slow text-[14px]">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[14px]">delete</span>
        )}
        {isPending ? "Deleting..." : "Delete"}
      </button>

      {showError && (
        <div className="absolute bottom-full right-0 mb-2 w-max max-w-[200px] text-wrap p-2 rounded bg-rose-500 text-white text-xs shadow-lg animate-fade-in z-10 text-center">
          {state?.error}
        </div>
      )}
    </form>
  );
}
