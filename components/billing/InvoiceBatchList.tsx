"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { markInvoicePaidAction } from "@/app/admin/invoices/actions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
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

export default function InvoiceBatchList({ invoices }: { invoices: any[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedBatch, setSelectedBatch] = useState("");

  const filteredInvoices = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      inv.invoice_no.toLowerCase().includes(s) ||
      inv.lease.unit.unit_number.toLowerCase().includes(s) ||
      inv.lease.tenant.user_name.toLowerCase().includes(s);
      
    const matchesStatus = filterStatus === "All" || inv.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const batches = filteredInvoices.reduce((acc, inv) => {
    const key = getMonthYear(inv.invoice_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort batches by latest date first (simple sort by date of first item)
  const batchKeys = Object.keys(batches).sort((a, b) => {
    const dateA = new Date(batches[a][0].invoice_date).getTime();
    const dateB = new Date(batches[b][0].invoice_date).getTime();
    return dateB - dateA;
  });

  // Derive the active batch to show
  let currentBatch = selectedBatch;
  if (!currentBatch || !batchKeys.includes(currentBatch)) {
    currentBatch = batchKeys[0] || "";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          {batchKeys.length > 0 && (
            <select
              value={currentBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-sm focus:border-primary outline-none"
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
            className="px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-sm focus:border-primary outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
        
        <div className="flex-1 w-full md:max-w-xs relative">
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
            <span className="font-label-sm text-label-sm px-2 py-1 bg-surface-container-high rounded-md text-on-surface-variant">
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
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {batches[currentBatch].map((inv: any) => (
                  <tr key={inv.invoice_id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-on-surface">
                      {inv.invoice_no}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">{inv.lease.unit.unit_number}</span>
                        <span className="text-xs text-on-surface-variant">{inv.lease.tenant.user_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface">
                      {formatCurrency(Number(inv.total_amount))}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={inv.status} variant="invoice" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          href={`/print/invoice/${inv.invoice_id}`}
                          target="_blank"
                          className="text-on-surface-variant hover:text-primary transition-colors p-1"
                          title="Print Invoice"
                        >
                          <span className="material-symbols-outlined text-[18px]">print</span>
                        </Link>
                        {inv.status !== "Paid" && (
                          <form action={markInvoicePaidAction} className="inline-block">
                            <input type="hidden" name="invoice_id" value={inv.invoice_id} />
                            <button
                              type="submit"
                              className="text-emerald-600 hover:text-emerald-500 transition-colors p-1"
                              title="Mark Paid"
                            >
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
