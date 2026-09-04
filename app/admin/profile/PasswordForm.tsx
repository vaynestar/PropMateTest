"use client";

import { useActionState } from "react";
import { changeAdminPassword } from "./actions";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changeAdminPassword, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="newPassword" className="text-xs font-semibold text-white">
            New Password *
          </label>
          <span className="text-[11px] text-on-surface-variant">Minimum 6 characters</span>
        </div>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          placeholder="Enter new administrator password..."
          className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="confirmPassword" className="text-xs font-semibold text-white">
            Confirm Password *
          </label>
          <span className="text-[11px] text-on-surface-variant">Re-enter same password</span>
        </div>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          placeholder="Confirm new administrator password..."
          className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
        />
      </div>

      {state?.error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <span className="material-symbols-outlined text-rose-400 text-[18px]">error</span>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          <span>{state.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full sm:w-auto self-end px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all shadow-md pressable disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? (
          <>
            <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
            <span>Updating Password...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[16px]">lock_reset</span>
            <span>Update Password</span>
          </>
        )}
      </button>
    </form>
  );
}
