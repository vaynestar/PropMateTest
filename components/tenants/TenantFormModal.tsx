"use client";

import { useActionState, useEffect, useState } from "react";
import { addTenant } from "@/app/admin/tenants/actions";

interface TenantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fieldClass =
  "w-full rounded-xl border border-outline-variant/60 bg-surface-container-high px-3.5 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary";

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
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold text-white">{label}</label>
        {hint && <span className="text-[11px] text-on-surface-variant">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function TenantFormModal({ isOpen, onClose }: TenantFormModalProps) {
  const [state, formAction, isPending] = useActionState(addTenant, null);
  const [copied, setCopied] = useState(false);

  // Stay open on success so the one-time password can actually be read.
  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const created = state?.success ? state : null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-outline-variant/80 bg-surface-container shadow-2xl duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-high/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {created ? "Tenant added" : "Add a tenant"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {created
                  ? "Give them the password below — it is shown once."
                  : "Creates their portal login. Give them a unit afterwards with a lease."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {state?.error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <span className="material-symbols-outlined text-[18px] text-rose-400">error</span>
              <span>{state.error}</span>
            </div>
          )}

          {created ? (
            // One-time password. It used to be the same hardcoded string for
            // every resident, printed in the form before anyone had even typed
            // a name — so every account shipped with a known password.
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                {created.message}
              </div>

              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-high p-4">
                <p className="text-xs font-semibold text-white">Temporary password</p>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">
                  Shown once. They should change it after signing in.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-sm font-bold text-primary">
                    {created.tempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(String(created.tempPassword ?? ""));
                      setCopied(true);
                    }}
                    className="pressable shrink-0 rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form action={formAction} id="add-tenant-form" className="space-y-4">
              <Field label="Full name" hint="As per IC or passport">
                <input
                  name="user_name"
                  placeholder="e.g. Alex Tan Wei Ming"
                  required
                  className={fieldClass}
                />
              </Field>

              <Field label="NRIC / passport no." hint="Optional">
                <input name="ic_number" placeholder="e.g. 900101-14-5566" className={fieldClass} />
              </Field>

              <Field label="Email" hint="This is their login">
                <input
                  name="user_email"
                  type="email"
                  placeholder="e.g. alex.tan@example.com"
                  required
                  className={fieldClass}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mobile">
                  <input
                    name="phone_number"
                    placeholder="e.g. +6012-3456789"
                    required
                    className={fieldClass}
                  />
                </Field>

                <Field label="Vehicle plate" hint="Optional">
                  <input name="vehicle_plate" placeholder="e.g. WXY 1234" className={fieldClass} />
                </Field>
              </div>

              <fieldset className="space-y-3 rounded-xl border border-outline-variant/40 p-3.5">
                <legend className="px-1 text-xs font-semibold text-white">
                  Emergency contact{" "}
                  <span className="font-normal text-on-surface-variant">— optional</span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="emergency_contact_name"
                    placeholder="Name"
                    className={fieldClass}
                    aria-label="Emergency contact name"
                  />
                  <input
                    name="emergency_contact_phone"
                    placeholder="Phone"
                    className={fieldClass}
                    aria-label="Emergency contact phone"
                  />
                </div>
              </fieldset>

              <p className="rounded-xl border border-outline-variant/40 bg-surface-container-high/50 p-3 text-[11px] text-on-surface-variant">
                A one-time password is generated when you save. It is shown once on the next
                screen — copy it and pass it to the resident.
              </p>
            </form>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 bg-surface-container-high/40 px-6 py-4">
          {created ? (
            <button
              type="button"
              onClick={onClose}
              className="pressable rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-tenant-form"
                disabled={isPending}
                className="pressable flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending && (
                  <span className="material-symbols-outlined animate-spin-slow text-[16px]">
                    progress_activity
                  </span>
                )}
                <span>{isPending ? "Adding…" : "Add tenant"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
