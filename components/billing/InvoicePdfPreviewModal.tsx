"use client";

import { useRef, useState } from "react";
import Modal from "@/components/admin/Modal";
import DownloadButton from "@/components/ui/DownloadButton";
import { BTN } from "@/components/admin/ui";
import { markInvoicePrintedAction } from "@/app/admin/invoices/actions";

/**
 * Admin invoice preview. Shows the real document (/print/invoice/[id], the
 * same page residents preview) with two separate actions: Print, and Download
 * PDF (/api/invoices/[id]/pdf).
 *
 * It used to be a hand-built overlay: no `role="dialog"`, no Escape, no
 * backdrop close, while every other admin dialog had all three (DEV-204).
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

  return (
    <Modal
      title={`Invoice ${invoice.invoice_no}`}
      subtitle={`${lease?.tenant?.user_name ?? "Tenant"} · Unit ${lease?.unit?.unit_number ?? "—"}`}
      icon="picture_as_pdf"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={print} disabled={!loaded} className={BTN.secondary}>
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print
          </button>
          <DownloadButton
            url={`/api/invoices/${invoice.invoice_id}/pdf`}
            filename={`${invoice.invoice_no}.pdf`}
            onDownloaded={() => void markPrinted()}
            className={BTN.primary}
          />
        </>
      }
    >
      <div className="relative h-[70vh] overflow-hidden rounded-xl border border-outline-variant/40 bg-white">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-container text-sm text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Loading invoice…
          </div>
        )}
        <iframe
          ref={frame}
          src={`/print/invoice/${invoice.invoice_id}`}
          title={`Invoice ${invoice.invoice_no}`}
          onLoad={() => setLoaded(true)}
          className="h-full w-full bg-white"
        />
      </div>
    </Modal>
  );
}
