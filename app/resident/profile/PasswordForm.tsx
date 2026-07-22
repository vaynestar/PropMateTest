"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="font-label-md text-label-md text-on-surface-variant">
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
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
          required
          className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
        />
      </div>

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
        disabled={pending}
        className="mt-2 w-full sm:w-auto self-end px-6 py-2.5 bg-primary text-on-primary font-label-md font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
        Update Password
      </button>
    </form>
  );
}
