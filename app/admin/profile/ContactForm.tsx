"use client";

import { useActionState } from "react";
import { updateAdminContactDetails } from "./actions";
import { BTN, FIELD } from "@/components/admin/ui";

/**
 * The one profile detail an administrator may change about themselves.
 *
 * FR-18 lists Administrator and Resident as actors and promises both can
 * "view and update their profile details", but this page offered only a
 * password form — every field was read-only text. Name, email and role stay
 * read-only for the same reason they do on the resident page: they identify
 * the account rather than describe it.
 */
export default function ContactForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState(updateAdminContactDetails, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex max-w-sm flex-col gap-1">
        <span className="text-xs font-semibold text-on-surface">Contact phone</span>
        <input
          name="phone_number"
          type="tel"
          inputMode="tel"
          defaultValue={phone}
          placeholder="e.g. 012-345 6789"
          className={`${FIELD} w-full placeholder:text-on-surface-variant/50`}
        />
        <span className="text-[11px] text-on-surface-variant">
          Shown to residents who need to reach the management office.
        </span>
      </label>

      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state?.success && (
        <p className="flex items-center gap-1 text-sm text-emerald-300">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Saved.
        </p>
      )}

      <button type="submit" disabled={pending} className={`${BTN.primary} self-start`}>
        <span className="material-symbols-outlined text-[18px]">
          {pending ? "progress_activity" : "save"}
        </span>
        {pending ? "Saving…" : "Save contact details"}
      </button>
    </form>
  );
}
