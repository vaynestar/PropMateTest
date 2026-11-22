"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { BTN } from "@/components/admin/ui";
import { TICKET_STATUS_OPTIONS, ticketStateKey } from "@/lib/ticket-states";
import {
  assignTicketsAction,
  setTicketStatusAction,
  updateTicketAction,
} from "@/app/admin/maintenance/actions";

/**
 * Owner, state and cost — the three fields that record the work (DEV-266).
 *
 * They lived in a modal that dimmed the conversation behind them. Three
 * fields were never worth that, and the conversation is usually the reason
 * you are changing one of them.
 *
 * The owner field is red and says why when nobody holds the ticket. On a
 * page about a repair that has been open for 88 days, that is the fact that
 * matters.
 */
export default function TicketWorkRail({
  ticketId,
  assignedTo,
  status,
  cost,
  admins,
  daysUnowned,
}: {
  ticketId: string;
  assignedTo: string | null;
  status: string;
  cost: number | null;
  admins: { user_id: string; user_name: string }[];
  daysUnowned: number;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [costValue, setCostValue] = useState(cost === null ? "" : String(cost));
  const [isPending, startTransition] = useTransition();
  const unowned = !assignedTo;

  const assign = (to: string) => {
    startTransition(async () => {
      const res = await assignTicketsAction([ticketId], to || null);
      if (res.error) return setToast({ message: res.error, tone: "error" });
      router.refresh();
      setToast({
        message: to
          ? `It belongs to ${admins.find((a) => a.user_id === to)?.user_name ?? "them"} now.`
          : "It has no owner again.",
      });
    });
  };

  const advance = (next: string) => {
    startTransition(async () => {
      const res = await setTicketStatusAction(ticketId, next);
      if (res.error) return setToast({ message: res.error, tone: "error" });
      router.refresh();
      setToast({ message: `Moved to “${TICKET_STATUS_OPTIONS.find((o) => o.value === next)?.label}”.` });
    });
  };

  const saveCost = () => {
    const parsed = Number(costValue.replace(/[^\d.]/g, ""));
    if (costValue.trim() !== "" && (!Number.isFinite(parsed) || parsed < 0)) {
      setToast({ message: "Enter the cost as a number.", tone: "error" });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ticket_id", ticketId);
      fd.set("status", status);
      fd.set("cost", costValue.trim() === "" ? "" : String(parsed));
      const res: any = await updateTicketAction(fd);
      if (res?.error) return setToast({ message: res.error, tone: "error" });
      router.refresh();
      setToast({ message: "Cost recorded.", detail: "It feeds the maintenance spend in Reports." });
    });
  };

  const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant";

  return (
    <>
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-4">
        <h2 className="text-[15px] font-bold text-on-surface">The work</h2>

        <div className="mt-3 flex flex-col gap-3.5">
          <div>
            <label htmlFor="rail-owner" className={label}>
              Who is on it
            </label>
            <select
              id="rail-owner"
              value={assignedTo ?? ""}
              disabled={isPending}
              onChange={(e) => assign(e.target.value)}
              className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition-colors ${
                unowned
                  ? "border-dashed border-rose-400/60 bg-rose-500/10 font-bold text-rose-200"
                  : "border-outline-variant/60 bg-surface-container-high font-semibold text-on-surface"
              }`}
            >
              <option value="">Nobody yet</option>
              {admins.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.user_name}
                </option>
              ))}
            </select>
            {unowned && daysUnowned > 0 && (
              <p className="mt-1.5 text-[11px] font-medium text-rose-300">
                {daysUnowned} day{daysUnowned === 1 ? "" : "s"} with no owner. This is the field to fill.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="rail-state" className={label}>
              Where it is up to
            </label>
            <select
              id="rail-state"
              value={TICKET_STATUS_OPTIONS.find((o) => o.key === ticketStateKey(status))?.value ?? status}
              disabled={isPending}
              onChange={(e) => advance(e.target.value)}
              className="h-11 w-full rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-sm font-semibold text-on-surface outline-none"
            >
              {TICKET_STATUS_OPTIONS.map((o) => (
                <option key={o.key} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rail-cost" className={label}>
              What it cost
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-high focus-within:border-primary">
              <span className="flex h-11 items-center border-r border-outline-variant/60 px-3 text-xs font-bold text-on-surface-variant">
                RM
              </span>
              <input
                id="rail-cost"
                inputMode="decimal"
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
                onBlur={saveCost}
                placeholder="0.00"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums text-on-surface outline-none"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-on-surface-variant">
              Feeds the maintenance spend in Reports.
            </p>
          </div>

          <button type="button" onClick={saveCost} disabled={isPending} className={BTN.secondary + " w-full justify-center"}>
            {isPending ? "Saving…" : "Save the cost"}
          </button>
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
