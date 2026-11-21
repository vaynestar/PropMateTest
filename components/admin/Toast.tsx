"use client";

import { useEffect, useRef } from "react";

/**
 * One toast, shared (DEV-252).
 *
 * Eight modules each held `useState<{ message, type }>` and then hand-drew the
 * same bordered div inline, in the middle of a form. Three consequences, all
 * of them visible in UAT:
 *
 *   · none of them went away by themselves, so a success notice sat on the
 *     screen until the next render;
 *   · none of them offered a way back, so "Reminder sent to A-12-07" was
 *     final the moment it appeared, even when it was the wrong unit;
 *   · they were drawn inside the dialog that caused them, so a toast for a
 *     list action had nowhere to live and simply did not exist.
 *
 * This is deliberately NOT a provider with a context and a queue. Every call
 * site already holds the state it needs; what was duplicated is the markup and
 * the timing, so only those move here. One `<Toast>` per screen, fixed to the
 * bottom, above the phone's nav bar.
 *
 * Timing, from the design notes: eight seconds when there is an undo — long
 * enough to read a unit number and realise it was the wrong one — four when
 * there is not, and no auto-dismiss at all on an error, because the reader has
 * to be able to finish reading it.
 */

export type ToastTone = "success" | "error";

export type ToastState = {
  message: string;
  /** The specifics: the amount, the unit, the count. */
  detail?: string;
  tone?: ToastTone;
  /** When given, the toast carries an Undo and stays twice as long. */
  undo?: () => void;
  /** Label for the undo, when "Undo" is not the right word. */
  undoLabel?: string;
} | null;

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  // onDismiss in a ref so a new inline closure on every parent render does not
  // restart the timer and leave the toast up forever.
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  const tone = toast?.tone ?? "success";
  const hasUndo = !!toast?.undo;

  useEffect(() => {
    if (!toast || tone === "error") return;
    const ms = hasUndo ? 8000 : 4000;
    const t = setTimeout(() => dismiss.current(), ms);
    return () => clearTimeout(t);
    // The message identifies the toast: a second one replaces the first and
    // gets its own full life.
  }, [toast, toast?.message, tone, hasUndo]);

  if (!toast) return null;

  const good = tone === "success";

  return (
    <div
      role={good ? "status" : "alert"}
      aria-live={good ? "polite" : "assertive"}
      className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-20 sm:justify-end sm:px-6 sm:pb-6"
    >
      <div
        className={`animate-slide-in pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
          good
            ? "border-emerald-500/40 bg-emerald-500/[0.12]"
            : "border-rose-500/45 bg-rose-500/[0.14]"
        }`}
      >
        <span
          className={`material-symbols-outlined shrink-0 text-[20px] ${
            good ? "text-emerald-300" : "text-rose-300"
          }`}
          aria-hidden="true"
        >
          {good ? "check_circle" : "error"}
        </span>

        <div className="min-w-0 flex-1 basis-[200px]">
          <p className={`text-sm font-semibold ${good ? "text-emerald-100" : "text-rose-100"}`}>
            {toast.message}
          </p>
          {toast.detail && (
            <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{toast.detail}</p>
          )}
        </div>

        {toast.undo && (
          <button
            type="button"
            onClick={() => {
              toast.undo?.();
              onDismiss();
            }}
            className={`pressable shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              good
                ? "border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/15"
                : "border-rose-500/50 text-rose-200 hover:bg-rose-500/15"
            }`}
          >
            {toast.undoLabel ?? "Undo"}
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-white"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            close
          </span>
        </button>
      </div>
    </div>
  );
}
