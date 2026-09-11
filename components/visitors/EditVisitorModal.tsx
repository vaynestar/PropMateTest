"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { adminUpdateVisitor } from "@/app/admin/visitors/actions";
import { normaliseVisitorStatus, visitorStatus } from "@/lib/visitor-status";

/**
 * Correct a visitor record. See adminUpdateVisitor for what may change when -
 * the server enforces it; this form only reflects it so nobody types into a
 * field that will be refused.
 *
 * Portalled to document.body: the visitor list sits under the backdrop-filtered
 * header, which captures position: fixed descendants (DEV-159).
 */

type Visitor = {
  visitor_id: string;
  visitor_type?: string | null;
  visitor_name: string;
  visitor_ic_no: string;
  contact_no?: string | null;
  vehicle_plate?: string | null;
  visit_purpose?: string | null;
  destination?: string | null;
  visit_date?: Date | string | null;
  status?: string | null;
};

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  // Pin to Malaysia time: a @db.Date read back in UTC can land on the day before.
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

const inputCls =
  "w-full rounded-lg border border-outline-variant/60 bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-on-surface-variant/80">{hint}</span>}
    </label>
  );
}

export default function EditVisitorModal({
  visitor,
  onClose,
}: {
  visitor: Visitor;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const state = normaliseVisitorStatus(visitor.status);
  const identityLocked = state === "Checked In" || state === "Checked Out";
  const meta = visitorStatus(visitor.status);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await adminUpdateVisitor(visitor.visitor_id, formData);
      if (res?.error) setError(res.error);
      else onClose();
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-visitor-title"
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-outline-variant/80 bg-surface-container shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-5 py-4">
          <div className="min-w-0">
            <span className="block text-[11px] text-on-surface-variant">
              Edit visitor · {visitor.visitor_type || "Visitor"}
            </span>
            <h3 id="edit-visitor-title" className="truncate text-sm font-bold text-white">
              {visitor.visitor_name}
            </h3>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.chip}`}>
            {meta.label}
          </span>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {identityLocked && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              <span className="material-symbols-outlined text-[16px] leading-none">lock</span>
              <span>
                This visitor has already arrived, so their name and IC are fixed. If the wrong
                person was admitted, check them out and register the right one.
              </span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                name="visitor_name"
                defaultValue={visitor.visitor_name}
                disabled={identityLocked}
                required={!identityLocked}
                className={inputCls}
              />
            </Field>
            <Field label="IC or passport no.">
              <input
                name="visitor_ic_no"
                defaultValue={visitor.visitor_ic_no}
                disabled={identityLocked}
                required={!identityLocked}
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Contact no.">
              <input
                name="contact_no"
                defaultValue={visitor.contact_no ?? ""}
                inputMode="tel"
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Vehicle plate" hint="Leave blank if on foot.">
              <input
                name="vehicle_plate"
                defaultValue={visitor.vehicle_plate ?? ""}
                className={`${inputCls} font-mono uppercase`}
              />
            </Field>
            <Field label="Visit date">
              <input
                type="date"
                name="visit_date"
                defaultValue={toDateInput(visitor.visit_date)}
                disabled={identityLocked}
                required={!identityLocked}
                className={inputCls}
              />
            </Field>
            <Field label="Destination">
              <input
                name="destination"
                defaultValue={visitor.destination ?? ""}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Purpose of visit">
            <input
              name="visit_purpose"
              defaultValue={visitor.visit_purpose ?? ""}
              className={inputCls}
            />
          </Field>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <span className="material-symbols-outlined text-[16px] leading-none">error</span>
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 bg-surface-container-high/40 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="pressable rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary transition-opacity disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
