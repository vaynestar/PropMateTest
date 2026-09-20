"use client";

import { useState, useTransition } from "react";
import { CARD, EmptyState, FIELD, TABLE } from "@/components/admin/ui";

/** Row actions are icons with tooltips: four labelled buttons ran off the
 *  right edge of the table (DEV-199). */
const ICON_BTN = "pressable inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateInvoiceStatusAction, issueInvoice } from "@/app/admin/invoices/actions";
import EditInvoiceItemsModal from "./EditInvoiceItemsModal";
import InvoicePdfPreviewModal from "./InvoicePdfPreviewModal";
import VerifyPaymentModal from "./VerifyPaymentModal";

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
  const [verifyingInvoice, setVerifyingInvoice] = useState<any | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);
  const [, startTransition] = useTransition();

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleIssue = (invoiceId: string, invoiceNo: string) => {
    if (
      !window.confirm(
        `Issue ${invoiceNo} to the tenant?

After this its line items can no longer be edited. You can still record payment or void it.`
      )
    )
      return;
    setUpdatingStatusId(invoiceId);
    startTransition(async () => {
      try {
        const res = await issueInvoice(invoiceId);
        if (res.success) {
          showToast(res.message, "success");
          router.refresh();
        } else if (res.error) {
          showToast(res.error, "error");
        }
      } catch (e: any) {
        showToast(e.message || "Failed to issue invoice", "error");
      } finally {
        setUpdatingStatusId(null);
      }
    });
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
      
    const isOverdue = (() => {
      if (inv.status === "Paid" || inv.status === "Inactive") return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(inv.due_date) < today;
    })();
    const matchesStatus =
      filterStatus === "All"
        ? true
        : filterStatus === "Overdue"
        ? isOverdue
        : inv.status === filterStatus;

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

  // The month dropdown lists EVERY month that has invoices, not just the
  // months surviving the current status/search filter. Deriving its options
  // from filteredInvoices made the whole control vanish the moment a filter
  // returned nothing (pick "Voided" with no voided invoices and the toolbar
  // collapsed, sliding the status and date controls left). The option list is
  // fixed furniture; only the counts beside each month react to the filter.
  const allMonths = invoices.reduce((acc, inv) => {
    const key = getMonthYear(inv.invoice_date);
    (acc[key] ||= []).push(inv);
    return acc;
  }, {} as Record<string, any[]>);
  const allBatchKeys = Object.keys(allMonths).sort((a, b) => {
    const dateA = new Date(allMonths[a][0].invoice_date).getTime();
    const dateB = new Date(allMonths[b][0].invoice_date).getTime();
    return dateB - dateA;
  });

  // Default to every invoice. Opening on the newest month hid 7 of 8 invoices
  // here, including all the overdue ones, on a page whose whole job is chasing
  // them. The month selector is still there for anyone who wants one batch.
  let currentBatch = selectedBatch || "ALL";
  if (currentBatch !== "ALL" && !allBatchKeys.includes(currentBatch)) {
    currentBatch = "ALL";
  }

  // Active list to render: if date filter is active OR currentBatch is "ALL", show all filteredInvoices across batches!
  const displayedInvoices = hasDateFilter || currentBatch === "ALL" ? filteredInvoices : (batches[currentBatch] || []);

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-6">
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
      <div className={`${CARD} flex flex-col items-stretch justify-between gap-4 p-3.5 lg:flex-row lg:items-center`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Batch Selector (only active when custom date filter is off) */}
          {allBatchKeys.length > 0 && (
            <select
              value={currentBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={hasDateFilter}
              title={hasDateFilter ? "Clear the date range to pick a month" : undefined}
              className={`${FIELD} cursor-pointer border-primary/30 bg-primary/10 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <option value="ALL">All invoices ({filteredInvoices.length})</option>
              {allBatchKeys.map((bk) => (
                <option key={bk} value={bk}>
                  {bk} ({(batches[bk] ?? []).length})
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${FIELD} cursor-pointer`}
          >
            <option value="All">All statuses</option>
            <option value="Overdue">Overdue</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Inactive">Voided</option>
          </select>

          {/* User-Friendly Prominent Date Range Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`pressable flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-all ${
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
        <div className={CARD}>
          <EmptyState
            icon="receipt_long"
            title="No invoices found"
            hint="Try a different month, status or date range."
          />
        </div>
      ) : (
        <div className={`${CARD} animate-fade-in flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 bg-gradient-to-r from-surface-container-high/70 via-surface-container-high/25 to-transparent px-4 py-3.5">
            <h3 className="text-sm font-bold text-white">
              {hasDateFilter
                ? "Filtered Date Range Invoices"
                : currentBatch === "ALL"
                ? "All invoices"
                : currentBatch}
            </h3>
            <span className="rounded-md bg-surface-container-high px-2.5 py-1 text-[11px] font-semibold tabular-nums text-on-surface-variant">
              {displayedInvoices.length} invoices
            </span>
          </div>

          <div className={TABLE.wrap}>
            <table className={TABLE.table + " min-w-[980px]"}>
              <thead>
                <tr>
                  <th className={TABLE.th}>Invoice no</th>
                  <th className={TABLE.th}>Unit &amp; tenant</th>
                  <th className={TABLE.th}>Raised</th>
                  <th className={TABLE.th}>Due</th>
                  <th className={TABLE.thNum}>Amount</th>
                  <th className={TABLE.th}>Status</th>
                  <th className={TABLE.thNum}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedInvoices.map((inv: any) => {
                  const isPrinted = inv.is_printed;
                  const isPaid = inv.status === "Paid";
                  const isInactive = inv.status === "Inactive";
                  const isIssued = !!inv.issued_at;
                  const isDraft = !isIssued && !isPaid && !isInactive;
                  const isLocked = isPaid || isIssued || isInactive;
                  const isUpdating = updatingStatusId === inv.invoice_id;

                  const lockTooltip = isPaid
                    ? "Paid — items can no longer be changed"
                    : isIssued
                    ? "Issued to the tenant. Open to view, or unlock with your password to correct it."
                    : isInactive
                    ? "Voided — items can no longer be changed"
                    : "Edit Line Items";

                  return (
                    <tr
                      key={inv.invoice_id}
                      className={isInactive ? `${TABLE.tr} bg-surface-container-lowest/40 opacity-60` : TABLE.tr}
                    >
                      <td className={TABLE.td}>
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

                      <td className={TABLE.td}>
                        <div className="flex flex-col">
                          {/* The only way from an invoice to the person who owes it used to
                              be reading the name and searching Tenants by hand. */}
                          <Link
                            href={`/admin/invoices?lease=${inv.lease_id}`}
                            title="Every invoice on this lease"
                            className="w-max font-medium text-on-surface hover:text-primary hover:underline"
                          >
                            {inv.lease?.unit?.unit_number}
                          </Link>
                          {inv.lease?.tenant ? (
                            <Link
                              href={`/admin/leases?tenant=${inv.lease.tenant.user_id}`}
                              title="Open this tenant's lease"
                              className="w-max text-xs text-on-surface-variant hover:text-primary hover:underline"
                            >
                              {inv.lease.tenant.user_name}
                            </Link>
                          ) : (
                            <span className="text-xs text-on-surface-variant">No tenant on the lease</span>
                          )}
                          {inv.status === "Unpaid" && inv.transactions?.[0] && (
                            <button
                              type="button"
                              onClick={() => setVerifyingInvoice(inv)}
                              className="pressable mt-1 inline-flex w-max items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20"
                              title="The resident sent proof of payment. Check it and approve or reject."
                            >
                              <span className="material-symbols-outlined text-[12px]">fact_check</span>
                              Verify payment
                              {inv.transactions[0].reference_number && (
                                <span className="font-mono font-normal">· {inv.transactions[0].reference_number}</span>
                              )}
                            </button>
                          )}
                          {inv.modifier?.user_name && (
                            <span className="text-[10px] text-on-surface-variant/70 italic mt-0.5">
                              Edited by: {inv.modifier.user_name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={TABLE.td + " whitespace-nowrap text-xs tabular-nums text-on-surface-variant"}>
                        {formatDate(inv.invoice_date)}
                      </td>

                      <td className={TABLE.td + " whitespace-nowrap text-xs tabular-nums"}>
                        {(() => {
                          const due = new Date(inv.due_date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const daysLate = Math.floor(
                            (today.getTime() - due.getTime()) / 86_400_000
                          );
                          const isLate = inv.status !== "Paid" && daysLate > 0;
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className={isLate ? "text-rose-300" : "text-on-surface-variant"}>
                                {formatDate(inv.due_date)}
                              </span>
                              {isLate && (
                                <span
                                  className={`w-fit rounded font-sans text-[10px] font-semibold ${
                                    daysLate > 90
                                      ? "bg-rose-500/20 px-1.5 py-0.5 text-rose-200"
                                      : daysLate > 30
                                      ? "text-rose-300"
                                      : "text-amber-300"
                                  }`}
                                >
                                  {daysLate} day{daysLate === 1 ? "" : "s"} late
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className={TABLE.tdNum + " font-semibold"}>
                        {formatCurrency(Number(inv.total_amount))}
                      </td>

                      <td className={TABLE.td}>
                        <div className="flex items-center gap-2">
                          {isDraft ? (
                            <span className="rounded-md border border-outline-variant/60 bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                              Draft
                            </span>
                          ) : (
                            <StatusBadge status={inv.status} variant="invoice" />
                          )}
                        </div>
                      </td>

                      <td className={TABLE.tdNum}>
                        <div className="flex justify-end items-center gap-2">
                          {/* PDF Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPdfPreviewInvoice(inv)}
                            className={`${ICON_BTN} border-outline-variant/60 bg-surface-container-high text-primary hover:bg-surface-container-highest`}
                            title="Preview or download the invoice"
                            aria-label="Preview invoice"
                          >
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                          </button>

                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handleIssue(inv.invoice_id, inv.invoice_no)}
                              disabled={isUpdating}
                              title="Send this invoice to the tenant. Items lock afterwards."
                              className="pressable inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px] leading-none">outgoing_mail</span>
                              Issue
                            </button>
                          )}

                          {/* Edit Items Button (Disabled if Locked) */}
                          {isLocked ? (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className={`${ICON_BTN} border-outline-variant/30 bg-surface-container-high/40 text-amber-400 hover:bg-surface-container-high`}
                              title={lockTooltip}
                              aria-label="Locked - open to view or unlock"
                            >
                              <span className="material-symbols-outlined text-[18px]">lock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className={`${ICON_BTN} border-primary/20 bg-primary/10 text-primary hover:bg-primary/20`}
                              title="Edit the line items"
                              aria-label="Edit line items"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit_note</span>
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
                                  className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold leading-none transition-colors text-amber-300 hover:bg-amber-500/15"
                                  title="Move this invoice back to unpaid"
                                >
                                  <span className="material-symbols-outlined text-[16px] leading-none">undo</span>
                                  
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Paid")}
                                  className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold leading-none transition-colors text-emerald-300 hover:bg-emerald-500/15"
                                  title="Mark this invoice as paid"
                                >
                                  <span className="material-symbols-outlined text-[16px] leading-none">check_circle</span>
                                  
                                </button>
                              )}

                              {/* Toggle Inactive / Active */}
                              {isInactive ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Unpaid")}
                                  className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold leading-none transition-colors text-sky-300 hover:bg-sky-500/15"
                                  title="Bring this invoice back into the books"
                                >
                                  <span className="material-symbols-outlined text-[16px] leading-none">restart_alt</span>
                                  
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv.invoice_id, inv.invoice_no, "Inactive")}
                                  className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold leading-none transition-colors text-rose-300 hover:bg-rose-500/15"
                                  title="Void this invoice — it stops counting towards what is owed"
                                >
                                  <span className="material-symbols-outlined text-[16px] leading-none">block</span>
                                  
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
      {verifyingInvoice && verifyingInvoice.transactions?.[0] && (
        <VerifyPaymentModal
          submission={verifyingInvoice.transactions[0]}
          invoiceNo={verifyingInvoice.invoice_no}
          amount={Number(verifyingInvoice.total_amount)}
          tenantName={verifyingInvoice.lease?.tenant?.user_name ?? "Tenant"}
          unitNumber={verifyingInvoice.lease?.unit?.unit_number ?? "-"}
          onClose={() => setVerifyingInvoice(null)}
          onDone={(message) => {
            setVerifyingInvoice(null);
            showToast(message, "success");
            router.refresh();
          }}
        />
      )}

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
