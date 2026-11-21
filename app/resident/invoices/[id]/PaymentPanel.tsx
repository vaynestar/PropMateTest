"use client";

import { useActionState, useRef, useState } from "react";
import { ViewerButton } from "@/components/ui/MediaViewer";
import { fitUploadLimit, formatMb } from "@/lib/client/shrink-upload";
import { FILE_TOO_LARGE_MESSAGE } from "@/lib/upload-limit";
import { useRouter } from "next/navigation";
import { payOnlineAction, withdrawProofAction, type PaymentActionState } from "./actions";

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
  onChanged,
}: {
  invoiceId: string;
  amountLabel: string;
  bank: BankDetails;
  submission: Submission | null;
  today: string;
  onlineEnabled: boolean;
  /**
   * Inside the bill dialog (DEV-242) `router.refresh()` only re-renders the
   * list behind it - the dialog holds its own copy of the invoice and would
   * go on showing the state from before the receipt was sent. The dialog
   * passes this to refetch itself.
   */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  // The file actually sent - the picked one, or its shrunk copy.
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const [shrinking, setShrinking] = useState(false);
  /** Object URL of the picked image, so the resident can see what they chose. */
  const [preview, setPreview] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  const clearFile = () => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setReadyFile(null);
    setFileNote(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onWithdraw = async () => {
    if (!submission) return;
    setWithdrawing(true);
    setError(null);
    const res = await withdrawProofAction(invoiceId, submission.transactionId);
    setWithdrawing(false);
    if (res?.error) return setError(res.error);
    router.refresh();
    onChanged?.();
  };
  const [onlineState, payOnline, paying] = useActionState<PaymentActionState, FormData>(
    payOnlineAction.bind(null, invoiceId),
    null
  );

  const waiting = submission?.status === "Pending";
  const rejected = submission?.status === "Rejected";

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const f = input.files?.[0];
    setError(null);
    setReadyFile(null);
    if (!f) return setFileNote(null);
    if (!["image/jpeg", "image/png", "application/pdf"].includes(f.type)) {
      setError("Please upload a JPG, JPEG, PNG or PDF file only.");
      input.value = "";
      return setFileNote(null);
    }
    if (f.size > MAX_BYTES) setFileNote(`Compressing ${f.name}…`);
    setShrinking(true);
    const fitted = await fitUploadLimit(f, MAX_BYTES);
    setShrinking(false);
    if (!fitted) {
      setError(FILE_TOO_LARGE_MESSAGE);
      input.value = "";
      return setFileNote(null);
    }

    /*
     * Read the bytes NOW, not when the form is submitted.
     *
     * A File from the iOS photo picker is a live handle, not data: iOS hands
     * back a reference and transcodes HEIC to JPEG lazily. By the time fetch()
     * streams the body, that handle can fail - Safari has already promised a
     * Content-Length, sends fewer bytes, and the server cannot parse the
     * multipart. The resident saw "Couldn't read the upload", which told them
     * nothing, on a file that was well under the size limit.
     *
     * Two iPhones hit this on 19-20 Nov 2026 (0.1 MB and 3.1 MB). The same
     * sizes upload fine through Chrome, Edge and WebKit on a desktop, so the
     * route itself is sound. Materialising the bytes here removes the
     * dependency on a handle that may already be stale, and - just as
     * important - a photo that cannot be read now fails HERE, where we can say
     * something useful, instead of after a failed upload.
     */
    let ready = fitted.file;
    try {
      const bytes = await fitted.file.arrayBuffer();
      if (bytes.byteLength === 0) throw new Error("empty");
      ready = new File([bytes], fitted.file.name, {
        type: fitted.file.type || "application/octet-stream",
        lastModified: fitted.file.lastModified,
      });
    } catch {
      setError("That photo couldn't be opened. Take a new one, or pick a different file — or send without a photo.");
      input.value = "";
      return setFileNote(null);
    }
    setReadyFile(ready);
    /*
     * Show the resident what they actually picked. iOS drew a black square in
     * its own file input, so there was no way to tell a correct receipt from
     * the wrong photo until after it had been sent (user, 2026-11-20).
     */
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return ready.type.startsWith("image/") ? URL.createObjectURL(ready) : null;
    });
    setFileNote(
      fitted.shrunk
        ? `${f.name} · compressed ${formatMb(f.size)} → ${formatMb(fitted.file.size)}`
        : `${f.name} · ${formatMb(f.size)}`
    );
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const data = new FormData(e.currentTarget);
      data.set("invoiceId", invoiceId);
      if (readyFile) data.set("file", readyFile, readyFile.name);
      const res = await fetch("/api/payments/proof", { method: "POST", body: data });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't send your proof. Please try again.");
      } else {
        formRef.current?.reset();
        clearFile();
        router.refresh();
        onChanged?.();
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
            {/*
              Long-pressing twelve digits on a phone to select them is
              miserable, and getting one wrong sends the money nowhere.
              `select-all` stays as the fallback for anyone who prefers it.
            */}
            <dd className="flex items-center gap-2">
              <span className="select-all font-mono font-semibold text-on-surface">{bank.accountNo}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(bank.accountNo.replace(/\s+/g, ""));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    // Clipboard blocked (insecure origin, or the browser said no).
                    // The number is still selectable, so say nothing and let them.
                  }
                }}
                className="pressable shrink-0 rounded-lg border border-outline-variant/60 bg-surface-container-high px-2.5 py-1 text-[11px] font-semibold text-on-surface"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </dd>
          </dl>
        ) : (
          <p className="mt-1 text-xs text-on-surface-variant">
            Ask the management office for the account to pay into.
          </p>
        )}
      </div>

      {/* Proof */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-high/30 p-4">
        <h3 className="text-sm font-semibold text-on-surface">2 · Send your receipt</h3>

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
                  <ViewerButton
                    items={[{ src: `/api/payments/proof/${submission!.transactionId}`, title: "Your receipt", kind: "doc" }]}
                    className="font-semibold text-primary hover:underline"
                  >
                    View what you sent
                  </ViewerButton>
                </>
              )}
            </p>
            {/*
              * Sent the wrong receipt, or mistyped the reference? Until now
              * the only way back was to telephone the office. The office has
              * not looked at it yet, so withdrawing it costs nothing.
              *
              * "Withdraw", not "take it back" (user, 2026-11-22). It is the
              * word the rest of the system already uses - the stored status
              * is "Withdrawn" and so is the action - and the plainer phrasing
              * was the odd one out.
              */}
            <button
              type="button"
              onClick={onWithdraw}
              disabled={withdrawing}
              className="pressable mt-1 w-full rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 py-2.5 text-xs font-semibold text-on-surface disabled:opacity-60"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw and send again"}
            </button>
            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </p>
            )}
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
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-on-surface-variant">Receipt or screenshot · optional</span>
                <input
                  ref={fileRef}
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={onFile}
                  className="rounded-lg border border-dashed border-outline-variant bg-surface-container px-3 py-2.5 text-xs text-on-surface-variant file:mr-3 file:rounded-md file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                />
                {readyFile ? (
                  /*
                   * What they picked, before it is sent. iOS showed a black
                   * square in its own control, so the wrong photo could not be
                   * spotted until the office already had it.
                   */
                  <div className="mt-1 flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface-container p-2">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt={`Receipt you picked: ${readyFile.name}`}
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-container-high">
                        <span className="material-symbols-outlined text-[22px] text-on-surface-variant">picture_as_pdf</span>
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-on-surface">{readyFile.name}</span>
                      <span className="block text-[11px] text-on-surface-variant">{formatMb(readyFile.size)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="pressable shrink-0 rounded-lg border border-outline-variant/60 bg-surface-container-high px-3 py-2 text-[12px] font-semibold text-on-surface"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-on-surface-variant">
                    {fileNote ?? "You can send without one — the office checks your reference against the bank."}
                  </span>
                )}
              </label>

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
                  {/*
                    "Transfer reference" is the bank's phrase, not the
                    resident's, and it was the field most likely to stall
                    someone. An example beats a description.
                  */}
                  <span className="text-[11px] font-semibold text-on-surface-variant">Reference number</span>
                  <input
                    name="reference"
                    required
                    minLength={4}
                    maxLength={60}
                    placeholder="e.g. 1234567890"
                    className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                  />
                  <span className="text-[11px] text-on-surface-variant">The number on your transfer receipt.</span>
                </label>
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || shrinking}
                className="btn-primary pressable flex w-full items-center justify-center gap-2 rounded-lg py-3 font-label-md text-label-md disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">{sending ? "progress_activity" : "upload"}</span>
                {shrinking ? "Compressing…" : sending ? "Sending…" : rejected ? "Send it again" : "Send receipt"}
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
