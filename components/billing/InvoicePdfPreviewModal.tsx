"use client";

import { useRef, useState } from "react";
import DownloadButton from "@/components/ui/DownloadButton";
import { markInvoicePrintedAction } from "@/app/admin/invoices/actions";

/**
 * Admin invoice preview. Until DEV-191 this modal drew its own copy of the
 * invoice, which had drifted from the printed one. It now shows the real
 * document (/print/invoice/[id], the same page residents preview) with two
 * separate actions: Print, and Download PDF (/api/invoices/[id]/pdf).
 */
export default function InvoicePdfPreviewModal({
  invoice,
  onClose,
  onPrinted,
}: {
  invoice: any;
  onClose: () => void;
  onPrinted?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const { lease } = invoice;

  const markPrinted = async () => {
    try {
      const res = await markInvoicePrintedAction(invoice.invoice_id);
      if (res.success) onPrinted?.();
    } catch (e) {
      console.error(e);
    }
  };

  const print = () => {
    try {
      frame.current?.contentWindow?.focus();
      frame.current?.contentWindow?.print();
      void markPrinted();
    } catch {
      /* nothing else to do */
    }
  };

  const btn =
    "px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 pressable disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-container border border-outline-variant/80 rounded-2xl w-full max-w-4xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 bg-surface-container-low border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="material-symbols-outlined text-primary text-[24px]">picture_as_pdf</span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base text-on-surface font-bold truncate">Invoice {invoice.invoice_no}</h3>
              <p className="text-xs text-on-surface-variant truncate">
                {lease?.tenant?.user_name} · Unit {lease?.unit?.unit_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={print} disabled={!loaded} className={`${btn} border border-outline text-on-surface hover:bg-surface-container-high`}>
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print
            </button>
            <DownloadButton
              url={`/api/invoices/${invoice.invoice_id}/pdf`}
              filename={`${invoice.invoice_no}.pdf`}
              onDownloaded={() => void markPrinted()}
              className={`${btn} btn-primary text-white`}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 bg-surface-container-lowest/60">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant gap-2">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Loading invoice…
            </div>
          )}
          <iframe
            ref={frame}
            src={`/print/invoice/${invoice.invoice_id}`}
            title={`Invoice ${invoice.invoice_no}`}
            onLoad={() => setLoaded(true)}
            className="w-full h-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}
