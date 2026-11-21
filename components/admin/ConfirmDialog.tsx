"use client";

import type { ReactNode } from "react";
import { backdropProps, useDialogDismiss } from "@/components/ui/useDialogDismiss";

/**
 * The dialog shown before something that is hard to take back (DEV-253).
 *
 * Three problems it replaces:
 *
 *  1. `window.confirm()`. Issuing an invoice asked through the browser's own
 *     box — unstyled, untranslatable, no room for the consequence, and on a
 *     phone it arrives at the top of the screen looking like a site error.
 *     Closes the roadmap item "Replace native confirm() / alert()" for
 *     billing.
 *  2. Voiding had NO confirmation at all. One mis-click on a 32px icon with a
 *     tooltip took RM 5,000 out of what a unit owed, and the only way back was
 *     noticing and pressing a different 32px icon.
 *  3. "OK" and "Cancel". A reader has to re-read the question to work out
 *     which one does the thing. The buttons here say the verb.
 *
 * Props are deliberately plain: the caller owns the pending state and the
 * server call, exactly as it did around `window.confirm`.
 */
export default function ConfirmDialog({
  open,
  tone = "danger",
  title,
  body,
  /** Named after what it does: "Void it", "Issue it", "End the lease". */
  confirmLabel,
  /** Named after what it protects: "Keep it", "Leave it as a draft". */
  cancelLabel = "Keep it",
  /** One line, only when the action genuinely cannot be reversed. */
  irreversible,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  tone?: "danger" | "primary";
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  irreversible?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useDialogDismiss(open, onClose);
  if (!open) return null;

  const danger = tone === "danger";

  return (
    <div
      {...backdropProps(onClose, title)}
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        className={`animate-slide-in w-full max-w-md overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-2xl ${
          danger ? "border-rose-500/50" : "border-primary/50"
        }`}
      >
        <div className="p-5 sm:p-6">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
              danger
                ? "border-rose-500/35 bg-rose-500/10 text-rose-400"
                : "border-primary/35 bg-primary/10 text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              {danger ? "warning" : "outgoing_mail"}
            </span>
          </span>

          <h2 className={`mt-4 text-lg font-bold tracking-tight ${danger ? "text-rose-100" : "text-white"}`}>
            {title}
          </h2>

          {body && (
            <div
              className={`mt-2 space-y-2 text-[13px] leading-relaxed ${
                danger ? "text-rose-200/90" : "text-on-surface-variant"
              }`}
            >
              {body}
            </div>
          )}

          {irreversible && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-outline-variant/50 bg-surface-container px-3 py-2.5 text-xs font-semibold text-on-surface">
              <span className="material-symbols-outlined shrink-0 text-[16px] text-amber-400" aria-hidden="true">
                lock
              </span>
              {irreversible}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/40 bg-surface-container px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="pressable inline-flex h-11 items-center rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`pressable inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-60 ${
              danger
                ? "bg-rose-500 text-[#2a0710] hover:bg-rose-400"
                : "bg-primary text-on-primary hover:bg-primary/90"
            }`}
          >
            {pending && (
              <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">
                progress_activity
              </span>
            )}
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
