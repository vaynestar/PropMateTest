"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { registerVisitor } from "./actions";

const PURPOSES = ["Family visit", "Friends", "Delivery", "Contractor / repair", "Ride pick-up"];

const input =
  "w-full rounded-xl bg-surface-container-high border border-outline-variant px-3.5 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-base sm:text-sm";

/**
 * Register a visitor (DEV-189 redesign; user: "redesign visitor module as well
 * not so user friendly"). Visit date defaults to today with Today / Tomorrow
 * shortcuts, purpose has one-tap chips, the phone number the action already
 * accepted is finally on the form, and a success opens the new pass.
 */
export default function VisitorForm({ onRegistered }: { onRegistered?: () => void }) {
  const [state, formAction, isPending] = useActionState(registerVisitor, null);
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [date, setDate] = useState(today);
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setDate(today);
      setPurpose("");
      onRegistered?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {state?.success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          Visitor registered. Their pass is under Upcoming — tap "Show pass" to share it.
        </div>
      )}
      {state?.error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Visitor name *</span>
          <input name="visitor_name" required className={input} placeholder="e.g. Ali bin Abu" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">IC / passport no. *</span>
          <input name="visitor_ic_no" required className={input} placeholder="e.g. 900101-14-5555" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Phone (optional)</span>
          <input name="contact_no" type="tel" inputMode="tel" className={input} placeholder="e.g. 012-345 6789" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface">Car plate (optional)</span>
          <input name="vehicle_plate" className={`${input} uppercase placeholder:normal-case`} placeholder="e.g. WAB 1234" />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-on-surface">Visit date *</span>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: today, l: "Today" },
            { v: tomorrow, l: "Tomorrow" },
          ].map((o) => (
            <button
              key={o.l}
              type="button"
              onClick={() => setDate(o.v)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                date === o.v ? "bg-primary text-black border-primary" : "border-outline-variant text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {o.l}
            </button>
          ))}
          <input
            type="date"
            name="visit_date"
            required
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${input} w-auto flex-1 min-w-[10rem]`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-on-surface">Purpose *</span>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPurpose(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                purpose === p ? "bg-primary/20 text-primary border-primary/60" : "border-outline-variant text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          name="visit_purpose"
          required
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className={input}
          placeholder="Or type the reason"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full sm:w-auto sm:self-end px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 pressable"
      >
        <span className="material-symbols-outlined">{isPending ? "progress_activity" : "qr_code_2"}</span>
        {isPending ? "Creating pass…" : "Create visitor pass"}
      </button>
    </form>
  );
}
