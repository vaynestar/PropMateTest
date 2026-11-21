"use client";

import { ViewerButton } from "@/components/ui/MediaViewer";
import DownloadButton from "@/components/ui/DownloadButton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import PaymentPanel from "@/app/resident/invoices/[id]/PaymentPanel";
import type { InvoiceDetail } from "@/lib/invoice-detail";

const STATUS_LABEL: Record<string, string> = {
  Pending: "Being checked",
  Success: "Confirmed",
  Rejected: "Not accepted",
  Withdrawn: "You withdrew this",
  Failed: "Failed",
  "Amount mismatch": "Amount mismatch",
};

/**
 * One invoice, and how to pay it.
 *
 * Rendered identically by the page at /resident/invoices/[id] (where a
 * notification or a bookmark lands) and by the dialog the bill list opens
 * (DEV-242). `inDialog` only drops the page's own heading, which the dialog
 * header already carries.
 */
export default function InvoiceDetailBody({
  detail,
  inDialog = false,
  onChanged,
}: {
  detail: InvoiceDetail;
  inDialog?: boolean;
  onChanged?: () => void;
}) {
  const pdf = { url: `/api/invoices/${detail.invoiceId}/pdf`, filename: `${detail.invoiceNo}.pdf` };

  /*
   * Preview and Download (DEV-191; Adobe red at the user's request,
   * 2026-09-22, because people look for that colour when they want a PDF).
   *
   * On an UNPAID bill they were the two biggest, loudest controls on the
   * screen - a red download shouting over the thing the resident came to do,
   * which is pay. The colour stays; the placement and the weight do not.
   */
  const docActions = (
    <div className="grid grid-cols-2 gap-2">
      <ViewerButton
        items={[{ src: `/print/invoice/${detail.invoiceId}`, title: `Invoice ${detail.invoiceNo}`, kind: "doc", download: pdf }]}
        className={`pressable flex items-center justify-center gap-2 rounded-lg border border-sky-400/50 bg-sky-500/15 font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 ${
          detail.isUnpaid ? "py-2 text-xs" : "py-2.5 text-sm"
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">visibility</span>
        Preview
      </ViewerButton>
      <DownloadButton
        url={pdf.url}
        filename={pdf.filename}
        className={`pressable flex w-full items-center justify-center gap-2 rounded-lg border border-[#e0301e]/60 bg-[#e0301e]/90 font-semibold text-white transition-colors hover:bg-[#e0301e] disabled:opacity-60 ${
          detail.isUnpaid ? "py-2 text-xs" : "py-2.5 text-sm"
        }`}
      />
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-stack-lg">
      <section className={`flex flex-col gap-4 rounded-xl ${inDialog ? "" : "glass-card p-5"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-on-surface-variant">{detail.invoiceNo}</p>
            <h2 className="mt-1 text-2xl font-bold text-on-surface">{detail.amountLabel}</h2>
            <p className="mt-1 text-xs text-on-surface-variant">{detail.unitLabel}</p>
          </div>
          {detail.checking ? (
            <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              Being checked
            </span>
          ) : (
            <StatusBadge status={detail.overdue ? "Overdue" : detail.status} variant="invoice" />
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-outline-variant/30 pt-3 text-xs">
          <div>
            <dt className="text-on-surface-variant">Issued</dt>
            <dd className="font-medium text-on-surface">{detail.issued}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Due</dt>
            <dd className={`font-medium ${detail.overdue ? "text-rose-300" : "text-on-surface"}`}>{detail.due}</dd>
          </div>
        </dl>

        <ul className="divide-y divide-outline-variant/25 border-t border-outline-variant/30">
          {detail.lines.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0 text-on-surface">
                {d.description}
                {d.qty !== 1 && (
                  <span className="block text-[11px] text-on-surface-variant">
                    {d.qty} × {d.unitPrice}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium text-on-surface">{d.total}</span>
            </li>
          ))}
          <li className="flex justify-between py-2.5 text-sm font-bold text-on-surface">
            <span>Total</span>
            <span>{detail.totalLabel}</span>
          </li>
        </ul>

        {!detail.isUnpaid && docActions}
      </section>

      {detail.isUnpaid && (
        <section className={`flex flex-col gap-3 rounded-xl ${inDialog ? "" : "glass-card p-5"}`}>
          <h2 className="text-base font-semibold text-on-surface">Pay this bill</h2>
          <PaymentPanel
            invoiceId={detail.invoiceId}
            amountLabel={detail.amountLabel}
            bank={detail.bank}
            submission={detail.submission}
            today={detail.today}
            onlineEnabled={detail.onlineEnabled}
            onChanged={onChanged}
          />
        </section>
      )}

      {/* The document, after the thing they came to do. */}
      {detail.isUnpaid && (
        <div className="-mt-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            The invoice itself
          </p>
          {docActions}
        </div>
      )}

      {detail.history.length > 0 && (
        <section className={`rounded-xl ${inDialog ? "" : "glass-card p-5"}`}>
          <h2 className="mb-2 text-sm font-semibold text-on-surface">Payment history</h2>
          <ul className="divide-y divide-outline-variant/25 text-xs">
            {detail.history.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0 text-on-surface-variant">
                  {t.on} · {t.method}
                  {t.reference && <span className="block font-mono">{t.reference}</span>}
                  {t.status === "Rejected" && t.reviewNote && (
                    <span className="block text-rose-300">{t.reviewNote}</span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium text-on-surface">{t.amount}</span>
                  <span className="text-on-surface-variant">{STATUS_LABEL[t.status] ?? t.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
