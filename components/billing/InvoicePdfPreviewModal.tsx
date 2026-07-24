"use client";

import { useState } from "react";
import { markInvoicePrintedAction } from "@/app/admin/invoices/actions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function InvoicePdfPreviewModal({
  invoice,
  onClose,
  onPrinted,
}: {
  invoice: any;
  onClose: () => void;
  onPrinted?: () => void;
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printed, setPrinted] = useState(invoice.is_printed || false);

  const handlePrintDownload = async () => {
    setIsPrinting(true);
    try {
      // Mark invoice as printed in database
      const res = await markInvoicePrintedAction(invoice.invoice_id);
      if (res.success) {
        setPrinted(true);
        if (onPrinted) onPrinted();
      }

      // Trigger browser print for PDF download/printing
      const printUrl = `/print/invoice/${invoice.invoice_id}`;
      const printWindow = window.open(printUrl, "_blank");
      if (printWindow) {
        printWindow.focus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPrinting(false);
    }
  };

  const { lease, details } = invoice;
  const { unit } = lease || {};
  const { property } = unit || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-container border border-outline-variant/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Action Bar */}
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">
              picture_as_pdf
            </span>
            <div>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">
                PDF Invoice Preview: {invoice.invoice_no}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Tenant: {lease?.tenant?.user_name} (Unit {unit?.unit_number})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badges */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                invoice.status === "Paid"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : invoice.status === "Inactive"
                  ? "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {invoice.status}
            </span>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                printed
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-surface-container-high text-on-surface-variant border border-outline-variant/50"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {printed ? "print_connect" : "draft"}
              </span>
              {printed ? "Printed (Locked)" : "Draft"}
            </span>

            {/* Print / Download Button */}
            <button
              type="button"
              onClick={handlePrintDownload}
              disabled={isPrinting}
              className="btn-primary px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md pressable disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPrinting ? "progress_activity" : "print"}
              </span>
              {isPrinting ? "Processing..." : "Print / Export PDF"}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 PDF Paper Sheet */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface-container-lowest/60 flex justify-center">
          <div className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 md:p-12 rounded-lg shadow-xl border border-slate-200 text-sm flex flex-col justify-between select-none">
            <div>
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-extrabold text-2xl tracking-tight text-indigo-900">
                      Prop<span className="text-indigo-600">Mate</span>
                    </span>
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      OFFICIAL INVOICE
                    </span>
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    INVOICE
                  </h1>
                  <p className="font-mono text-sm font-bold text-indigo-700 mt-1">
                    {invoice.invoice_no}
                  </p>
                </div>

                <div className="text-right">
                  <h2 className="text-lg font-bold text-slate-800">
                    {property?.property_name || "PropMate Residence"}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {property?.address || "Building Management Office"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {property?.city || ""}, {property?.state || ""} {property?.postal_code || ""}
                  </p>
                  <p className="text-xs text-slate-600">{property?.country || ""}</p>
                </div>
              </div>

              {/* Bill To & Invoice Info */}
              <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Bill To (Resident)
                  </p>
                  <p className="text-base font-bold text-slate-900">
                    {lease?.tenant?.user_name || "Resident"}
                  </p>
                  <p className="text-xs font-semibold text-indigo-700">
                    Unit: {unit?.unit_number || "-"}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Phone: {lease?.tenant?.phone_number || "-"}
                  </p>
                  <p className="text-xs text-slate-600">
                    Email: {lease?.tenant?.user_email || "-"}
                  </p>
                </div>

                <div className="text-right space-y-1.5">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Invoice Date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(invoice.invoice_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Payment Due Date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(invoice.due_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Status
                    </span>
                    <span
                      className={`inline-block font-extrabold text-xs px-2.5 py-0.5 rounded ${
                        invoice.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : invoice.status === "Inactive"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase">
                      <th className="py-3 px-4 w-1/2">Item Description</th>
                      <th className="py-3 px-4 text-center">Qty / UOM</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {details && details.length > 0 ? (
                      details.map((d: any) => (
                        <tr key={d.detail_id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {d.description}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {Number(d.quantity)} {d.uom || "item"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            RM {Number(d.unit_price).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            RM {Number(d.total_price).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 px-4 text-center italic text-slate-500">
                          No line items specified.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Summary Box */}
              <div className="flex justify-end mb-8">
                <div className="w-full sm:w-1/2 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(Number(invoice.total_amount))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Taxes / SST (0%):</span>
                    <span className="font-mono font-semibold">RM 0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-slate-800 font-extrabold text-slate-900 text-base">
                    <span>Total Billed Amount:</span>
                    <span className="text-indigo-700 font-mono text-lg">
                      {formatCurrency(Number(invoice.total_amount))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer & Payment Info */}
            <div className="pt-6 border-t border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <p className="font-bold text-slate-800">Payment Instructions:</p>
                <p>1. Pay online via Resident Portal / Online Banking.</p>
                <p>2. Please quote Invoice No ({invoice.invoice_no}) for reference.</p>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <p>Generated by PropMate Management System</p>
                {invoice.modifier?.user_name && (
                  <p>Last edited by: {invoice.modifier.user_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
