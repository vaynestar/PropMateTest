"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { residentInvoiceDetail } from "@/app/resident/invoices/detail-action";
import type { InvoiceDetail } from "@/lib/invoice-detail";
import InvoiceDetailBody from "./InvoiceDetailBody";

/**
 * A bill, opened from the list without leaving it (DEV-242; user: "Bill click
 * inside show details seem like the back button is not significant, i suggest
 * do it pop out as well to standardize the workflow across all module").
 *
 * The detail used to be a route, and the only way back was a small "← All
 * bills" text link above the fold. Every other resident surface - a repair
 * thread, a booking, a notice, a visitor pass - is a dialog, so the one
 * screen a resident visits most often was the one that navigated away.
 *
 * The route still exists and still works: a notification linking to a bill,
 * or a bookmark, lands on the full page. This is the same body in a dialog.
 */
export default function InvoiceDetailModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(() => {
    residentInvoiceDetail(invoiceId)
      .then((res) => (res.detail ? setDetail(res.detail) : setError(res.error ?? "Couldn't open this bill.")))
      .catch(() => setError("Couldn't reach the server. Check your connection and try again."));
  }, [invoiceId]);

  useEffect(() => {
    setMounted(true);
    load();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [load, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Bill">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-outline-variant/60 bg-surface-container shadow-2xl animate-slide-up sm:max-h-[88dvh] sm:max-w-lg sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container/95 px-5 py-3 backdrop-blur">
          <span className="text-xs font-semibold text-on-surface-variant">
            {detail ? `Bill ${detail.invoiceNo}` : "Bill"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {!detail && !error && (
            <div className="flex flex-col items-center gap-2 py-12 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
              <span className="text-xs">Opening your bill…</span>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="material-symbols-outlined text-[28px] text-rose-300">error</span>
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}
          {detail && <InvoiceDetailBody detail={detail} inDialog onChanged={load} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
