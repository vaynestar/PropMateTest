"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateInvoiceStatusAction } from "@/app/admin/invoices/actions";
import EditInvoiceItemsModal from "./EditInvoiceItemsModal";
import InvoicePdfPreviewModal from "./InvoicePdfPreviewModal";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
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

function getMonthYear(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function InvoiceBatchList({
  invoices,
  chargeMasters = [],
}: {
  invoices: any[];
  chargeMasters?: any[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [pdfPreviewInvoice, setPdfPreviewInvoice] = useState<any | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleStatusChange = (invoiceId: string, currentInvoiceNo: string, newStatus: string) => {
    setUpdatingStatusId(invoiceId);
    startTransition(async () => {
      try {
        const res = await updateInvoiceStatusAction(invoiceId, newStatus);
        if (res.success) {
          showToast(res.message, newStatus === "Paid" ? "success" : newStatus === "Unpaid" ? "info" : "error");
          router.refresh();
        } else if (res.error) {
          showToast(res.error, "error");
        }
      } catch (e: any) {
        showToast(e.message || "Failed to update status", "error");
      } finally {
        setUpdatingStatusId(null);
      }
    });
  };

  const filteredInvoices = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      inv.invoice_no.toLowerCase().includes(s) ||
      inv.lease.unit.unit_number.toLowerCase().includes(s) ||
      inv.lease.tenant.user_name.toLowerCase().includes(s);
      
    const matchesStatus = filterStatus === "All" || inv.status === filterStatus;

    const invDateStr = new Date(inv.invoice_date).toISOString().split("T")[0];
    const matchesFromDate = !fromDate || invDateStr >= fromDate;
    const matchesToDate = !toDate || invDateStr <= toDate;
    
    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const batches = filteredInvoices.reduce((acc, inv) => {
    const key = getMonthYear(inv.invoice_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort batches by latest date first
  const batchKeys = Object.keys(batches).sort((a, b) => {
    const dateA = new Date(batches[a][0].invoice_date).getTime();
    const dateB = new Date(batches[b][0].invoice_date).getTime();
    return dateB - dateA;
  });

  // Derive the active batch to show
  let currentBatch = selectedBatch;
  if (!currentBatch || !batchKeys.includes(currentBatch)) {
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthKey = getMonthYear(lastMonthDate);

    if (batchKeys.includes(lastMonthKey)) {
      currentBatch = lastMonthKey;
    } else {
      currentBatch = batchKeys[0] || "";
    }
  }

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-slide-in backdrop-blur-md ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toastMessage.type === "info"
              ? "bg-sky-950/90 border-sky-500/50 text-sky-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMessage.type === "success" ? "check_circle" : toastMessage.type === "info" ? "info" : "error"}
          </span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-card rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {batchKeys.length > 0 && (
            <select
              value={currentBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-sm focus:border-primary outline-none cursor-pointer"
            >
              {batchKeys.map((bk) => (
                <option key={bk} value={bk}>
                  {bk} ({batches[bk].length})
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Inactive">Inactive / Disabled</option>
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 bg-surface-container-high/60 border border-outline-variant/60 rounded-lg px-3 py-1.5 text-xs text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">calendar_today</span>
            <span className="font-semibold text-on-surface-variant">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent border-none outline-none text-on-surface text-xs font-mono"
            />
            <span className="font-semibold text-on-surface-variant">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent border-none outline-none text-on-surface text-xs font-mono"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="text-rose-400 hover:text-rose-300 p-0.5 ml-1"
                title="Clear date filter"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="w-full lg:w-64 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search unit, tenant, or invoice no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none transition-colors"
          />
        </div>
      </div>

      {batchKeys.length === 0 || !currentBatch ? (
        <div className="glass-card rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-4">
            receipt_long
          </span>
          <h3 className="font-title-lg text-title-lg text-on-surface">No invoices found</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-0 overflow-hidden flex flex-col animate-fade-in">
          <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
            <h3 className="font-title-md text-title-md text-on-surface">{currentBatch}</h3>
            <span className="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container-high rounded-md text-on-surface-variant font-semibold">
              {batches[currentBatch].length} Invoices
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">Invoice No</th>
                  <th className="px-6 py-3 font-medium">Unit & Tenant</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status & Print</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {batches[currentBatch].map((inv: any) => {
                  const isPrinted = inv.is_printed;
                  const isPaid = inv.status === "Paid";
                  const isInactive = inv.status === "Inactive";
                  const isLocked = isPaid || isPrinted || isInactive;
                  const isUpdating = updatingStatusId === inv.invoice_id;

                  const lockTooltip = isPaid
                    ? "Locked: Paid invoice cannot be edited"
                    : isPrinted
                    ? "Locked: Printed invoice cannot be edited"
                    : isInactive
                    ? "Locked: Inactive invoice cannot be edited"
                    : "Edit Line Items";

                  return (
                    <tr key={inv.invoice_id} className={`transition-colors ${isInactive ? 'opacity-60 bg-surface-container-lowest/40' : 'hover:bg-surface-container-low/50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-bold text-on-surface">
                            {inv.invoice_no}
                          </span>
                          {isPrinted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded w-max">
                              <span className="material-symbols-outlined text-[12px]">print</span>
                              Printed
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-on-surface">{inv.lease?.unit?.unit_number}</span>
                          <span className="text-xs text-on-surface-variant">{inv.lease?.tenant?.user_name}</span>
                          {inv.modifier?.user_name && (
                            <span className="text-[10px] text-on-surface-variant/70 italic mt-0.5">
                              Edited by: {inv.modifier.user_name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-on-surface-variant">
                        {formatDate(inv.due_date)}
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-on-surface">
                        {formatCurrency(Number(inv.total_amount))}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={inv.status} variant="invoice" />
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {/* PDF Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPdfPreviewInvoice(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 text-on-surface text-xs font-semibold inline-flex items-center gap-1.5 transition-all pressable"
                            title="Preview PDF & Print"
                          >
                            <span className="material-symbols-outlined text-[16px] text-primary">picture_as_pdf</span>
                            <span>PDF Preview</span>
                          </button>

                          {/* Edit Items Button (Disabled if Locked) */}
                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high/40 text-on-surface-variant/50 border border-outline-variant/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-container-high transition-all"
                              title={lockTooltip}
                            >
                              <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
                              <span>Locked</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold inline-flex items-center gap-1.5 transition-all pressable"
                              title="Edit Line Items / Add Item"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit_note</span>
                              <span>Edit Items</span>
                            </button>
                          )}

                          {/* Status Action Controls */}
                          {isUpdating ? (
                            <span className="material-symbols-outlined animate-spin text-[18px] text-primary p-1">
                              progress_activity
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 bg-surface-container-high/50 p-1 rounded-lg border border-outline-variant/30">
                              {/* Toggle Paid / Unpaid */}
                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Unpaid")}
                                  className="text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-surface-container-highest transition-colors"
                                  title="Revert Status to Unpaid"
                                >
                                  <span className="material-symbols-outlined text-[18px]">undo</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Paid")}
                                  className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-surface-container-highest transition-colors"
                                  title="Mark Status as Paid"
                                >
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                </button>
                              )}

                              {/* Toggle Inactive / Active */}
                              {isInactive ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Unpaid")}
                                  className="text-sky-400 hover:text-sky-300 p-1 rounded hover:bg-surface-container-highest transition-colors"
                                  title="Re-activate Invoice"
                                >
                                  <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Inactive")}
                                  className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-surface-container-highest transition-colors"
                                  title="Disable / Deactivate Invoice"
                                >
                                  <span className="material-symbols-outlined text-[18px]">block</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Line Items Modal */}
      {editingInvoice && (
        <EditInvoiceItemsModal
          invoice={editingInvoice}
          chargeMasters={chargeMasters}
          onClose={() => setEditingInvoice(null)}
        />
      )}

      {/* Interactive PDF Preview Modal */}
      {pdfPreviewInvoice && (
        <InvoicePdfPreviewModal
          invoice={pdfPreviewInvoice}
          onClose={() => setPdfPreviewInvoice(null)}
          onPrinted={() => {
            setPdfPreviewInvoice((prev: any) => (prev ? { ...prev, is_printed: true } : null));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
