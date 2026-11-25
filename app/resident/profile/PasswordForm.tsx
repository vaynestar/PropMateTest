"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "./actions";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="font-label-md text-label-md text-on-surface-variant">
          Current Password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="font-label-md text-label-md text-on-surface-variant">
          New Password
        </label>
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
          className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="font-label-md text-label-md text-on-surface-variant">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch || undefined}
          aria-describedby="confirm-hint"
          className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
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
        <div className="p-3 bg-error-container/20 border border-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2 mt-2">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 bg-primary/20 border border-primary text-primary-fixed rounded-lg text-sm flex items-center gap-2 mt-2">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || mismatch || tooShort || state?.signedOut}
        className="mt-2 w-full sm:w-auto self-end px-6 py-2.5 bg-primary text-on-primary font-label-md font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
        Update Password
      </button>
    </form>
  );
}
