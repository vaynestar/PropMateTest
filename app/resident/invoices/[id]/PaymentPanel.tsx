"use client";

import { useActionState } from "react";
import { payOnlineAction, submitManualPaymentAction, type PaymentActionState } from "./actions";

/**
 * How to pay one invoice. Online payment opens ToyyibPay's own checkout page,
 * which shows the banks; PropMate draws no bank logos and never sees bank or
 * card details.
 */
export default function PaymentPanel({
  invoiceId,
  amountLabel,
  onlineEnabled,
  sandbox,
  pendingManualReference,
}: {
  invoiceId: string;
  amountLabel: string;
  onlineEnabled: boolean;
  sandbox: boolean;
  pendingManualReference: string | null;
}) {
  const [onlineState, payOnline, paying] = useActionState<PaymentActionState, FormData>(
    payOnlineAction.bind(null, invoiceId),
    null
  );
  const [manualState, submitManual, submitting] = useActionState<PaymentActionState, FormData>(
    submitManualPaymentAction.bind(null, invoiceId),
    null
  );

  return (
    <div className="flex flex-col gap-4">
      {onlineEnabled ? (
        <form action={payOnline} className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={paying}
            className="btn-primary pressable flex w-full items-center justify-center gap-2 rounded-lg py-3 font-label-md text-label-md disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">
              {paying ? "progress_activity" : "account_balance"}
            </span>
            {paying ? "Opening checkout…" : `Pay ${amountLabel} with FPX online banking`}
          </button>
          <p className="text-center text-[11px] text-on-surface-variant">
            You&apos;ll choose your bank on ToyyibPay&apos;s secure page, then come back here.
            {sandbox && (
              <span className="mt-1 block font-semibold text-amber-300">
                Test mode — no real money is charged.
              </span>
            )}
          </p>
          {onlineState?.error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {onlineState.error}
            </p>
          )}
        </form>
      ) : (
        <p className="rounded-lg border border-outline-variant/50 bg-surface-container-high/40 p-3 text-xs text-on-surface-variant">
          Online payment isn&apos;t available yet. Pay by bank transfer and tell us below.
        </p>
      )}

      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-high/30 p-4">
        <h3 className="text-sm font-semibold text-on-surface">Paid by bank transfer?</h3>
        {pendingManualReference ? (
          <p className="mt-1 text-xs text-on-surface-variant">
            You told us about a transfer with reference{" "}
            <span className="font-mono font-semibold text-on-surface">{pendingManualReference}</span>. The
            management office will confirm it.
          </p>
        ) : manualState?.success ? (
          <p role="status" className="mt-1 text-xs text-emerald-300">
            {manualState.success}
          </p>
        ) : (
          <form action={submitManual} className="mt-2 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="reference">
              Transfer reference
            </label>
            <input
              id="reference"
              name="reference"
              required
              minLength={4}
              maxLength={60}
              placeholder="Bank transfer reference"
              className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={submitting}
              className="pressable rounded-lg border border-outline px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-60"
            >
              {submitting ? "Sending…" : "I've paid"}
            </button>
          </form>
        )}
        {manualState?.error && (
          <p role="alert" className="mt-2 text-xs text-rose-300">
            {manualState.error}
          </p>
        )}
      </div>
    </div>
  );
}
