"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ViewerButton } from "@/components/ui/MediaViewer";
import {
  getPaymentReviewContextAction,
  reviewPaymentAction,
} from "@/app/admin/invoices/payment-actions";
import { rm } from "@/lib/money";
import { dayMonth } from "@/lib/short-date";

/**
 * Check a bank-in slip (rebuilt DEV-260, to the batch-1 `VerifySlip` and
 * `VerifyReject` artboards).
 *
 * What was missing. The dialog showed the invoice total and the resident's
 * reference, but **never the figure being accepted**, and never what had
 * already been paid on the bill — the two numbers that answer the only
 * question this screen asks, *does this settle it*. Approving marked the
 * whole invoice Paid regardless.
 *
 * And it could only ever be the full amount: `submitPaymentEvidence` writes
 * `transaction_amount: invoice.total_amount` and never asks the resident. So
 * a resident who transferred half their service charge had no way to say so
 * and the office had no way to record it. **The only two outcomes were
 * settled in full and rejected.** The office now records what the slip
 * actually shows, and the invoice is marked Paid only when the money covers
 * it.
 */

export type PendingSubmission = {
  transaction_id: string;
  reference_number: string | null;
  payment_date: string | Date;
  created_at: string | Date;
  proof_mime: string | null;
  proof_filename: string | null;
};

const day = (d: string | Date) => dayMonth(d, true);

export default function VerifyPaymentModal({
  submission,
  invoiceNo,
  amount,
  tenantName,
  unitNumber,
  onClose,
  onDone,
}: {
  submission: PendingSubmission;
  invoiceNo: string;
  /** The invoice total, as the list knows it. */
  amount: number;
  tenantName: string;
  unitNumber: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ctx, setCtx] = useState<{
    invoiceTotal: number;
    alreadyPaid: number;
    outstanding: number;
    claimed: number;
  } | null>(null);
  const [record, setRecord] = useState("");

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

  const load = useCallback(async () => {
    const c = await getPaymentReviewContextAction(submission.transaction_id);
    if (!c) return;
    setCtx(c);
    setRecord(c.claimed.toFixed(2));
  }, [submission.transaction_id]);
  useEffect(() => {
    load();
  }, [load]);

  const proofUrl = `/api/payments/proof/${submission.transaction_id}`;
  const hasFile = Boolean(submission.proof_mime);
  const isImage = submission.proof_mime?.startsWith("image/");

  const total = ctx?.invoiceTotal ?? amount;
  const outstanding = ctx?.outstanding ?? amount;
  const parsed = Number(record.replace(/[^\d.]/g, ""));
  const valid = Number.isFinite(parsed) && parsed > 0 && Math.round(parsed * 100) <= Math.round(outstanding * 100);
  const shortfall = valid ? outstanding - parsed : 0;

  const decide = (decision: "approve" | "reject") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await reviewPaymentAction(
          submission.transaction_id,
          decision,
          note,
          decision === "approve" ? parsed : undefined
        );
        if ("error" in res) setError(res.error);
        else onDone(res.message);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  };

  if (!mounted) return null;

  const facts: { label: string; value: string; tone?: "warn" | "mono" }[] = [
    { label: "Invoice total", value: rm(total) },
    ...(ctx && ctx.alreadyPaid > 0
      ? [{ label: "Already paid on this bill", value: rm(ctx.alreadyPaid) }]
      : []),
    { label: "Still outstanding", value: rm(outstanding) },
    { label: "Reference they typed", value: submission.reference_number ?? "—", tone: "mono" as const },
    { label: "They say they paid on", value: day(submission.payment_date) },
    { label: "Sent", value: day(submission.created_at) },
  ];

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-outline-variant/80 bg-surface-container-lowest shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/50 px-5 py-4">
          <div className="min-w-0">
            <h3 id="verify-title" className="text-lg font-extrabold tracking-tight text-on-surface">
              Check this payment
            </h3>
            <p className="mt-0.5 truncate text-xs text-on-surface-variant">
              Unit {unitNumber} · {tenantName} ·{" "}
              <span className="font-mono">{invoiceNo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
          {/* The slip itself */}
          <div className="flex min-w-[280px] flex-[1_1_320px] flex-col gap-3 border-outline-variant/45 bg-surface-container-lowest p-4 md:border-r">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                The slip they sent
              </span>
              {hasFile && (
                <ViewerButton
                  items={[{ src: proofUrl, title: "Payment receipt", kind: "doc" }]}
                  className="pressable inline-flex h-8 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-high px-2.5 text-[11px] font-semibold text-on-surface"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                  Open full size
                </ViewerButton>
              )}
            </div>

            <div className="flex min-h-[15rem] flex-1 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container">
              {!hasFile ? (
                /*
                 * The receipt became optional on 2026-11-20, so a submission
                 * can legitimately carry no file. Without this branch the PDF
                 * icon was shown for a file that does not exist, and "Open
                 * full size" pointed at a 404.
                 */
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
                    receipt_long
                  </span>
                  <span className="text-sm font-semibold text-on-surface">No receipt attached</span>
                  <span className="max-w-[18rem] text-xs text-on-surface-variant">
                    Check the reference against the bank statement before accepting.
                  </span>
                </div>
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofUrl}
                  alt={`Payment slip for ${invoiceNo}`}
                  className="max-h-[52dvh] w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                  <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
                    picture_as_pdf
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {submission.proof_filename ?? "Receipt.pdf"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* The judgement */}
          <div className="flex min-w-[300px] flex-[1.15_1_340px] flex-col gap-3.5 p-5">
            <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container">
              {facts.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex items-baseline justify-between gap-3 px-3.5 py-2.5 ${
                    i ? "border-t border-outline-variant/30" : ""
                  }`}
                >
                  <span className="text-xs text-on-surface-variant">{f.label}</span>
                  <span
                    className={`text-right text-[13px] font-bold ${
                      f.tone === "mono"
                        ? "break-all font-mono text-xs text-on-surface"
                        : "tabular-nums text-on-surface"
                    }`}
                  >
                    {f.value}
                  </span>
                </div>
              ))}
            </div>

            {/* The mismatch the office must not miss. */}
            {valid && shortfall > 0.004 && (
              <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-3.5 py-3">
                <span className="material-symbols-outlined mt-px shrink-0 text-[17px] text-amber-300">
                  error
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-200">{rm(shortfall)} short of the bill</p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                    Accepting this leaves {rm(shortfall)} outstanding. That is allowed — part payments
                    happen — but it will not settle the invoice.
                  </p>
                </div>
              </div>
            )}

            {!rejecting && (
              <div>
                <label htmlFor="record-amount" className="mb-1.5 block text-xs font-bold text-on-surface">
                  Amount to record
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high focus-within:border-primary">
                  <span className="flex h-11 items-center border-r border-outline-variant px-3 text-sm font-bold text-on-surface-variant">
                    RM
                  </span>
                  <input
                    id="record-amount"
                    inputMode="decimal"
                    value={record}
                    onChange={(e) => setRecord(e.target.value)}
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold tabular-nums text-on-surface outline-none"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-on-surface-variant">
                  Change this only if the slip shows a different figure from the one on file.
                </p>
                {record && !valid && (
                  <p role="alert" className="mt-1.5 text-[11px] font-semibold text-rose-300">
                    Enter an amount between RM 0.01 and {rm(outstanding)}.
                  </p>
                )}
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-on-surface">
                {rejecting ? "Why isn't it accepted?" : "Note"}
                {!rejecting && (
                  <span className="font-normal text-on-surface-variant"> — optional, the resident sees it</span>
                )}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={rejecting ? 3 : 2}
                maxLength={500}
                autoFocus={rejecting}
                placeholder={
                  rejecting
                    ? "e.g. The reference on the slip does not appear on our statement."
                    : "e.g. Part payment received, balance due 30 Nov"
                }
                className="resize-none rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
              />
              {rejecting && (
                <span className="text-[11px] text-on-surface-variant">
                  The resident sees this and can send new proof.
                </span>
              )}
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300"
              >
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-outline-variant/50 bg-surface-container-lowest px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-3.5">
          {rejecting ? (
            <>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                disabled={pending}
                className="pressable inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-on-surface-variant hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => decide("reject")}
                disabled={pending || note.trim().length < 5}
                className="pressable ml-auto inline-flex h-11 items-center rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 text-sm font-bold text-rose-300 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Not accepted — tell them why"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={pending}
                className="pressable inline-flex h-10 items-center rounded-xl border border-rose-500/40 px-3.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
              >
                Not accepted…
              </button>
              <span className="ml-auto flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="pressable inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-on-surface-variant hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => decide("approve")}
                  disabled={pending || !valid}
                  className="pressable inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {pending ? "Saving…" : `Accept ${valid ? rm(parsed) : ""}`.trim()}
                </button>
              </span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
