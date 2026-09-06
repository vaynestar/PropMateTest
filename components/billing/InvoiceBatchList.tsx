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

  // Date Filter State & Presets
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePreset, setActivePreset] = useState<string>("all");
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // Preset Handlers
  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey);
    const now = new Date();

    if (presetKey === "all") {
      setFromDate("");
      setToDate("");
    } else if (presetKey === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(end.toISOString().split("T")[0]);
    } else if (presetKey === "last_30") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (presetKey === "last_90") {
      const start = new Date();
      start.setDate(now.getDate() - 90);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else if (presetKey === "this_year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(end.toISOString().split("T")[0]);
    }
  };

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
    setActivePreset("all");
    setShowDatePicker(false);
  };

  const hasDateFilter = Boolean(fromDate || toDate);

  // Filter Logic
  const filteredInvoices = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      inv.invoice_no.toLowerCase().includes(s) ||
      inv.lease?.unit?.unit_number?.toLowerCase().includes(s) ||
      inv.lease?.tenant?.user_name?.toLowerCase().includes(s);
      
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

  // Derive the active batch to show if date filter is NOT active
  let currentBatch = selectedBatch;
  if (!currentBatch || (!batchKeys.includes(currentBatch) && currentBatch !== "ALL")) {
    const lastMonthDate = new Date();
    const lastMonthKey = getMonthYear(lastMonthDate);

    if (batchKeys.includes(lastMonthKey)) {
      currentBatch = lastMonthKey;
    } else {
      currentBatch = batchKeys[0] || "";
    }
  }

  // Active list to render: if date filter is active OR currentBatch is "ALL", show all filteredInvoices across batches!
  const displayedInvoices = hasDateFilter || currentBatch === "ALL" ? filteredInvoices : (batches[currentBatch] || []);

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
          {/* Month Batch Selector (only active when custom date filter is off) */}
          {!hasDateFilter && batchKeys.length > 0 && (
            <select
              value={currentBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-sm focus:border-primary outline-none cursor-pointer"
            >
              <option value="ALL">📋 All Invoices ({filteredInvoices.length})</option>
              {batchKeys.map((bk) => (
                <option key={bk} value={bk}>
                  📅 {bk} ({batches[bk].length})
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
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

          {/* User-Friendly Prominent Date Range Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all pressable border ${
                hasDateFilter
                  ? "bg-primary/15 text-primary border-primary/40 shadow-sm"
                  : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-outline-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                calendar_month
              </span>
              <span>
                {hasDateFilter
                  ? `Date: ${fromDate ? formatDate(fromDate) : "Start"} → ${toDate ? formatDate(toDate) : "End"}`
                  : "Filter by Date Range"}
              </span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                {showDatePicker ? "expand_less" : "expand_more"}
              </span>
            </button>

            {/* Interactive Date Picker Popover Panel */}
            {showDatePicker && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-40 bg-surface-container-highest border border-outline-variant/80 rounded-2xl p-4 shadow-2xl min-w-[320px] sm:min-w-[360px] animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40 mb-3">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]">date_range</span>
                    Select Billing Date Range
                  </span>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="text-on-surface-variant hover:text-on-surface p-1 rounded-full"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                {/* Quick Presets Chips */}
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-on-surface-variant block mb-2">
                    ⚡ Quick Range Shortcuts
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "all", label: "All Time" },
                      { key: "this_month", label: "This Month" },
                      { key: "last_30", label: "Last 30 Days" },
                      { key: "last_90", label: "Last 90 Days" },
                      { key: "this_year", label: "This Year" },
                    ].map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handlePresetSelect(p.key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                          activePreset === p.key && hasDateFilter
                            ? "bg-primary text-on-primary shadow-sm"
                            : "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/40"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom From & To Pickers */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setActivePreset("custom");
                      }}
                      className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setActivePreset("custom");
                      }}
                      className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-2.5 py-1.5 text-white text-xs font-mono outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Popover Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/40">
                  <button
                    type="button"
                    onClick={clearDateFilter}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
                  >
                    Reset Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="btn-primary px-4 py-1.5 text-xs font-bold rounded-lg"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset All Filters Button when active */}
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg"
              title="Clear the date range and go back to monthly batches"
            >
              <span className="material-symbols-outlined text-[14px]">cancel</span>
              Clear Date Range
            </button>
          )}
        </div>
        
        {/* Search Box */}
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

      {/* Active Filter Summary Bar */}
      {hasDateFilter && (
        <div className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            <span>
              Showing <strong>{displayedInvoices.length}</strong> invoice(s) issued between{" "}
              <strong>{fromDate ? formatDate(fromDate) : "Beginning"}</strong> and{" "}
              <strong>{toDate ? formatDate(toDate) : "Today"}</strong>.
            </span>
          </div>
          <button
            onClick={clearDateFilter}
            className="font-bold underline hover:text-primary-container"
          >
            Switch to Monthly Batches
          </button>
        </div>
      )}

      {displayedInvoices.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-4">
            receipt_long
          </span>
          <h3 className="font-title-lg text-title-lg text-on-surface">No invoices found</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Try adjusting your search or date range filters.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-0 overflow-hidden flex flex-col animate-fade-in">
          <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
            <h3 className="font-title-md text-title-md text-on-surface">
              {hasDateFilter
                ? "Filtered Date Range Invoices"
                : currentBatch === "ALL"
                ? "All Invoices Overview"
                : currentBatch}
            </h3>
            <span className="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container-high rounded-md text-on-surface-variant font-semibold">
              {displayedInvoices.length} Invoices
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">Invoice No</th>
                  <th className="px-6 py-3 font-medium">Unit & Tenant</th>
                  <th className="px-6 py-3 font-medium">Invoice Date</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status & Print</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {displayedInvoices.map((inv: any) => {
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

                      <td className="px-6 py-4 text-on-surface-variant font-mono text-xs">
                        {formatDate(inv.invoice_date)}
                      </td>

                      <td className="px-6 py-4 text-on-surface-variant font-mono text-xs">
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
                                  title="Mark this invoice as paid"
                                  aria-label="Mark this invoice as paid"
                                >
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                  <span className="hidden lg:inline">Paid</span>
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
                                  title="Void this invoice — it stops counting towards what is owed"
                                  aria-label="Void this invoice"
                                >
                                  <span className="material-symbols-outlined text-[18px]">block</span>
                                  <span className="hidden lg:inline">Void</span>
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
