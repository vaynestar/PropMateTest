"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { payOnlineAction, type PaymentActionState } from "./actions";

const MAX_BYTES = 4 * 1024 * 1024;

export type Submission = {
  transactionId: string;
  status: string;
  reference: string | null;
  paidOn: string;
  submittedOn: string;
  reviewNote: string | null;
  hasProof: boolean;
};

export type BankDetails = { bankName: string; accountName: string; accountNo: string } | null;

/**
 * Pay by bank transfer, then prove it. The office verifies the proof and only
 * then is the invoice marked Paid (user, 2026-09-15).
 */
export default function PaymentPanel({
  invoiceId,
  amountLabel,
  bank,
  submission,
  today,
  onlineEnabled,
}: {
  invoiceId: string;
  amountLabel: string;
  bank: BankDetails;
  submission: Submission | null;
  today: string;
  onlineEnabled: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [onlineState, payOnline, paying] = useActionState<PaymentActionState, FormData>(
    payOnlineAction.bind(null, invoiceId),
    null
  );

  const waiting = submission?.status === "Pending";
  const rejected = submission?.status === "Rejected";

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) return setFileNote(null);
    if (f.size > MAX_BYTES) {
      setError("That file is over 4 MB. Try a screenshot instead.");
      e.target.value = "";
      return setFileNote(null);
    }
    setFileNote(`${f.name} · ${(f.size / 1024 / 1024).toFixed(1)} MB`);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const data = new FormData(e.currentTarget);
      data.set("invoiceId", invoiceId);
      const res = await fetch("/api/payments/proof", { method: "POST", body: data });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't send your proof. Please try again.");
      } else {
        formRef.current?.reset();
        setFileNote(null);
        router.refresh();
      }
    } catch {
      // Keep what they entered - a dropped connection shouldn't cost them the form (R6).
      setError("Couldn't reach the server. Check your connection and try again — your details are still here.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Where to pay */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-high/30 p-4">
        <h3 className="text-sm font-semibold text-on-surface">1 · Transfer {amountLabel}</h3>
        {bank ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-on-surface-variant">Bank</dt>
            <dd className="font-medium text-on-surface">{bank.bankName}</dd>
            <dt className="text-on-surface-variant">Account name</dt>
            <dd className="font-medium text-on-surface">{bank.accountName}</dd>
            <dt className="text-on-surface-variant">Account no.</dt>
            <dd className="select-all font-mono font-semibold text-on-surface">{bank.accountNo}</dd>
          </dl>
        ) : (
          <p className="mt-1 text-xs text-on-surface-variant">
            Ask the management office for the account to pay into.
          </p>
        )}
      </div>

      {/* Proof */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-high/30 p-4">
        <h3 className="text-sm font-semibold text-on-surface">2 · Send your proof</h3>

        {waiting ? (
          <div role="status" className="mt-2 flex flex-col gap-2 text-xs">
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              <span className="material-symbols-outlined text-[16px] leading-none">hourglass_top</span>
              <span>
                Sent on {submission!.submittedOn}. The management office is checking it — this invoice will show
                Paid once they confirm.
              </span>
            </p>
            <p className="text-on-surface-variant">
              Reference <span className="font-mono font-semibold text-on-surface">{submission!.reference}</span> ·
              paid {submission!.paidOn}
              {submission!.hasProof && (
                <>
                  {" · "}
                  <a
                    href={`/api/payments/proof/${submission!.transactionId}`}
                    target="_blank"
                    rel="noopener"
                    className="font-semibold text-primary hover:underline"
                  >
                    View what you sent
                  </a>
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            {rejected && (
              <p role="alert" className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                <span className="block font-semibold text-rose-300">Your last proof wasn&apos;t accepted</span>
                {submission!.reviewNote ?? "Please check the details and send it again."}
              </p>
            )}

            <form ref={formRef} onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-on-surface-variant">Date you paid</span>
                  <input
                    type="date"
                    name="paidOn"
                    required
                    max={today}
                    defaultValue={today}
                    className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary [color-scheme:dark]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-on-surface-variant">Transfer reference</span>
                  <input
                    name="reference"
                    required
                    minLength={4}
                    maxLength={60}
                    placeholder="From your bank app or receipt"
                    className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-on-surface-variant">Receipt or screenshot</span>
                <input
                  type="file"
                  name="file"
                  required
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={onFile}
                  className="rounded-lg border border-dashed border-outline-variant bg-surface-container px-3 py-2.5 text-xs text-on-surface-variant file:mr-3 file:rounded-md file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                />
                <span className="text-[11px] text-on-surface-variant">{fileNote ?? "JPG, PNG, WEBP or PDF, up to 4 MB"}</span>
              </label>

              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="btn-primary pressable flex w-full items-center justify-center gap-2 rounded-lg py-3 font-label-md text-label-md disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">{sending ? "progress_activity" : "upload"}</span>
                {sending ? "Sending…" : rejected ? "Send new proof" : "Send proof of payment"}
              </button>
            </form>
          </>
        )}
      </div>

      {onlineEnabled && !waiting && (
        <form action={payOnline} className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={paying}
            className="pressable rounded-lg border border-outline py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60"
          >
            {paying ? "Opening checkout…" : "Or pay online with FPX"}
          </button>
          {onlineState?.error && <p className="text-xs text-rose-300">{onlineState.error}</p>}
        </form>
      )}
    </div>
  );
}
