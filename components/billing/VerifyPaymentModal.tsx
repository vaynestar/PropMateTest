"use client";

import { useEffect, useState, useTransition } from "react";
import { ViewerButton } from "@/components/ui/MediaViewer";
import { createPortal } from "react-dom";
import { reviewPaymentAction } from "@/app/admin/invoices/payment-actions";
import { rm } from "@/lib/money";

/**
 * The office checks a resident's payment evidence against its bank statement
 * and approves or rejects it. Portalled to document.body (DEV-159).
 */

export type PendingSubmission = {
  transaction_id: string;
  reference_number: string | null;
  payment_date: string | Date;
  created_at: string | Date;
  proof_mime: string | null;
  proof_filename: string | null;
};

const day = (d: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));

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

  const proofUrl = `/api/payments/proof/${submission.transaction_id}`;
  const isImage = submission.proof_mime?.startsWith("image/");

  const decide = (decision: "approve" | "reject") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await reviewPaymentAction(submission.transaction_id, decision, note);
        if ("error" in res) setError(res.error);
        else onDone(res.message);
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-outline-variant/80 bg-surface-container shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-5 py-4">
          <div className="min-w-0">
            <span className="block text-[11px] text-on-surface-variant">Verify payment · {invoiceNo}</span>
            <h3 id="verify-title" className="truncate text-sm font-bold text-white">
              {tenantName} · Unit {unitNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-5 md:grid-cols-[1fr_16rem]">
          <div className="flex min-h-[16rem] items-center justify-center overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofUrl} alt={`Payment proof for ${invoiceNo}`} className="max-h-[60dvh] w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <span className="material-symbols-outlined text-[40px] text-on-surface-variant">picture_as_pdf</span>
                <span className="text-xs text-on-surface-variant">{submission.proof_filename ?? "Receipt.pdf"}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <dl className="flex flex-col gap-2">
              <div>
                <dt className="text-on-surface-variant">Invoice amount</dt>
                <dd className="text-lg font-bold text-white">{rm(amount)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Reference</dt>
                <dd className="break-all font-mono font-semibold text-on-surface">{submission.reference_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Date paid (resident says)</dt>
                <dd className="font-medium text-on-surface">{day(submission.payment_date)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Submitted</dt>
                <dd className="font-medium text-on-surface">{day(submission.created_at)}</dd>
              </div>
            </dl>

            <ViewerButton
              items={[{ src: proofUrl, title: "Payment receipt", kind: "doc" }]}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_full</span>
              Open full size
            </ViewerButton>

            <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5 leading-relaxed text-amber-200/90">
              Check the amount and reference against your bank statement before approving.
            </p>

            {rejecting && (
              <label className="flex flex-col gap-1">
                <span className="font-semibold text-on-surface-variant">Why isn&apos;t it accepted?</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  autoFocus
                  placeholder="e.g. Amount on the receipt is RM 4,500, invoice is RM 5,000."
                  className="resize-none rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
                />
                <span className="text-[11px] text-on-surface-variant">The resident sees this and can send new proof.</span>
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/40 bg-surface-container-high/40 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
          {rejecting ? (
            <>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                disabled={pending}
                className="pressable rounded-xl border border-outline-variant/60 px-4 py-2 text-xs font-semibold text-on-surface"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => decide("reject")}
                disabled={pending || note.trim().length < 5}
                className="pressable rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-300 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Reject payment"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={pending}
                className="pressable rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
              >
                Reject…
              </button>
              <button
                type="button"
                onClick={() => decide("approve")}
                disabled={pending}
                className="pressable rounded-xl bg-emerald-500/90 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Approve & mark paid"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
