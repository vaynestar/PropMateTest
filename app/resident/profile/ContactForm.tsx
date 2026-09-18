"use client";

import { useActionState } from "react";
import { updateContactDetails } from "./actions";

const input =
  "w-full rounded-xl bg-surface-container-high border border-outline-variant px-3.5 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-base sm:text-sm";

/**
 * The details a resident may keep up to date themselves (DEV-189; user: "does
 * resident can change their contact number? I know email cant"). Name, email
 * and IC stay with the management office - they identify the person.
 */
export default function ContactForm({
  phone,
  plate,
  emergencyName,
  emergencyPhone,
}: {
  phone: string;
  plate: string;
  emergencyName: string;
  emergencyPhone: string;
}) {
  const [state, action, pending] = useActionState(updateContactDetails, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Mobile number</span>
          <input name="phone_number" type="tel" inputMode="tel" defaultValue={phone} className={input} placeholder="e.g. 012-345 6789" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Car plate</span>
          <input name="vehicle_plate" defaultValue={plate} className={`${input} uppercase placeholder:normal-case`} placeholder="e.g. WAB 1234" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Emergency contact name</span>
          <input name="emergency_contact_name" defaultValue={emergencyName} className={input} placeholder="e.g. Tan Mei Ling (sister)" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Emergency contact phone</span>
          <input name="emergency_contact_phone" type="tel" inputMode="tel" defaultValue={emergencyPhone} className={input} placeholder="e.g. 019-876 5432" />
        </label>
      </div>
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-emerald-300 flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary self-start px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50 pressable"
      >
        <span className="material-symbols-outlined text-[18px]">{pending ? "progress_activity" : "save"}</span>
        {pending ? "Saving…" : "Save contact details"}
      </button>
    </form>
  );
}
