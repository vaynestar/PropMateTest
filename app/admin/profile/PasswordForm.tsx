"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeAdminPassword } from "./actions";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changeAdminPassword, null);

  const router = useRouter();

  /*
   * Catch a mismatch here, not after a round trip (DEV-291).
   *
   * Both rules are still enforced on the server, which is what decides — this
   * only stops the person discovering a typo in a field they cannot read back.
   * Nothing is cleared on a failure: the point is to let them correct what
   * they typed, not to make them key all three again.
   */
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 6;

  /*
   * A successful change signs every device out, this one included, so there
   * is nothing left to stay on. Pause long enough to read why, then go.
   */
  useEffect(() => {
    if (!state?.signedOut) return;
    const t = setTimeout(() => router.push("/login"), 2500);
    return () => clearTimeout(t);
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="text-xs font-semibold text-white">
          Current password *
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your current password..."
          className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="newPassword" className="text-xs font-semibold text-white">
            New password *
          </label>
          <span className="text-[11px] text-on-surface-variant">Minimum 6 characters</span>
        </div>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={tooShort || undefined}
          placeholder="Enter new administrator password..."
          className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="confirmPassword" className="text-xs font-semibold text-white">
            Confirm password *
          </label>
          <span className="text-[11px] text-on-surface-variant">Must match the new password</span>
        </div>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch || undefined}
          aria-describedby="confirm-hint"
          placeholder="Confirm new administrator password..."
          className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
        />
      </div>

      <p
        id="confirm-hint"
        role={mismatch || tooShort ? "alert" : undefined}
        className={`-mt-2 text-xs ${
          mismatch || tooShort ? "font-semibold text-rose-300" : "text-on-surface-variant"
        }`}
      >
        {tooShort
          ? "At least 6 characters."
          : mismatch
          ? "These two do not match yet."
          : "At least 6 characters, and both boxes must match."}
      </p>

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
        disabled={pending || mismatch || tooShort || state?.signedOut}
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
            <span>Update password</span>
          </>
        )}
      </button>
    </form>
  );
}
