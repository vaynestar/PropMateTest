"use client";

import { useActionState, useState, useTransition } from "react";
import { createAdminAccount, setAdminActive } from "./actions";
import { BTN, CARD, FIELD } from "@/components/admin/ui";

export type AdminRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  phone_number: string | null;
  is_active: boolean;
};

/**
 * Administrator accounts.
 *
 * Added because the only way to create one was a database script — the
 * Tenants screen hardcodes `role: "Resident"`. It sits behind the admin
 * session rather than on the login page: administrators in PropMate are
 * global, so a public sign-up would hand a stranger every property's
 * residents.
 */
export default function AdminAccountsPanel({
  admins,
  currentUserId,
}: {
  admins: AdminRow[];
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState(createAdminAccount, null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (row: AdminRow) => {
    setBusyId(row.user_id);
    setRowMessage(null);
    startTransition(async () => {
      const res = await setAdminActive(row.user_id, !row.is_active);
      setRowMessage(res);
      setBusyId(null);
    });
  };

  const activeCount = admins.filter((a) => a.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Administrator accounts</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {admins.length} account{admins.length === 1 ? "" : "s"}, {activeCount} active. Residents
            are added under Tenants, not here.
          </p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className={BTN.secondary}>
          <span className="material-symbols-outlined text-[18px]">{adding ? "close" : "person_add"}</span>
          {adding ? "Cancel" : "Add administrator"}
        </button>
      </div>

      {adding && (
        <form action={action} className={`${CARD} space-y-3 p-4`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Full name</span>
              <input name="user_name" required className={`${FIELD} w-full`} placeholder="e.g. Nurul Huda binti Idris" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Email</span>
              <input name="user_email" type="email" required className={`${FIELD} w-full`} placeholder="name@propmate.com" />
              <span className="text-[11px] text-on-surface-variant">This is their login.</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Phone</span>
              <input name="phone_number" type="tel" className={`${FIELD} w-full`} placeholder="e.g. 012-345 6789" />
              <span className="text-[11px] text-on-surface-variant">Optional</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-on-surface">Temporary password</span>
              <input name="password" type="password" required minLength={6} className={`${FIELD} w-full`} />
              <span className="text-[11px] text-on-surface-variant">
                Minimum 6 characters. They can change it under Profile.
              </span>
            </label>
          </div>

          {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
          {state?.success && (
            <p className="flex items-center gap-1 text-sm text-emerald-300">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {state.success}
            </p>
          )}

          <button type="submit" disabled={pending} className={BTN.primary}>
            <span className="material-symbols-outlined text-[18px]">
              {pending ? "progress_activity" : "person_add"}
            </span>
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>
      )}

      {rowMessage?.error && <p className="text-sm text-rose-300">{rowMessage.error}</p>}
      {rowMessage?.success && <p className="text-sm text-emerald-300">{rowMessage.success}</p>}

      <ul className={`${CARD} divide-y divide-outline-variant/40`}>
        {admins.map((a) => (
          <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="truncate">{a.user_name}</span>
                {a.user_id === currentUserId && (
                  <span className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    You
                  </span>
                )}
                {!a.is_active && (
                  <span className="shrink-0 rounded-md border border-outline-variant/60 bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                    Deactivated
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-on-surface-variant">
                {a.user_email}
                {a.phone_number ? ` · ${a.phone_number}` : ""}
              </p>
            </div>

            {a.user_id !== currentUserId && (
              <button
                type="button"
                onClick={() => toggle(a)}
                disabled={busyId === a.user_id}
                className={a.is_active ? BTN.ghost : BTN.secondary}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {busyId === a.user_id ? "progress_activity" : a.is_active ? "person_off" : "person_check"}
                </span>
                {a.is_active ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed text-on-surface-variant">
        Accounts are deactivated, never deleted — an administrator is recorded as the author of the
        properties, leases, invoices and tickets they created. Deactivating blocks sign-in
        immediately and removes them from the ticket assignee list.
      </p>
    </div>
  );
}
