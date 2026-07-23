import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/lib/billing";
import StatusBadge from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

import GenerateInvoicesButton from "@/components/billing/GenerateInvoicesButton";
import BillingMonthlyBarChart from "@/components/billing/BillingMonthlyBarChart";

export default async function BillingPage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;

  const invoices = await listInvoices(propertyId);

  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0
  );
  const outstanding = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const paidCount = invoices.filter((inv) => inv.status === "Paid").length;

  function getMonthYear(date: Date | string) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  }

  const batches = invoices.reduce((acc, inv) => {
    const key = getMonthYear(inv.invoice_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {} as Record<string, typeof invoices>);

  const batchKeys = Object.keys(batches).sort((a, b) => {
    const dateA = new Date(batches[a][0].invoice_date).getTime();
    const dateB = new Date(batches[b][0].invoice_date).getTime();
    return dateB - dateA;
  });

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Billing
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Generate monthly rental invoices from occupied units.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/billing/recurring-charges"
            className="btn-outline px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              autorenew
            </span>
            Recurring Charges
          </Link>
          <Link
            href="/admin/billing/charges"
            className="btn-outline px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              settings
            </span>
            Charge Masterfile
          </Link>
          <GenerateInvoicesButton />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-lg">
        <div className="glass-card rounded-xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Total Billed
          </p>
          <p className="font-headline-md text-headline-md text-on-surface mt-1">
            {formatCurrency(totalBilled)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Outstanding
          </p>
          <p className="font-headline-md text-headline-md text-rose-300 mt-1">
            {formatCurrency(outstanding)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Paid / Total
          </p>
          <p className="font-headline-md text-headline-md text-emerald-300 mt-1">
            {paidCount} / {invoices.length}
          </p>
        </div>
      </div>

      <BillingMonthlyBarChart invoices={invoices} />

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Invoice Batches Overview
          </h2>
          <Link
            href="/admin/invoices"
            className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
          >
            View all details
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high/50">
              <tr className="font-label-sm text-label-sm text-on-surface-variant">
                <th className="px-6 py-3">Batch Name</th>
                <th className="px-6 py-3 text-center">Invoices Generated</th>
                <th className="px-6 py-3 text-right">Collected (Paid)</th>
                <th className="px-6 py-3 text-right">Outstanding</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {batchKeys.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 font-body-md text-body-md text-on-surface-variant text-center"
                  >
                    No invoice batches yet. Click "Generate Monthly Invoices" to create
                    them from occupied units.
                  </td>
                </tr>
              )}
              {batchKeys.map((bk) => {
                const batchInvoices = batches[bk];
                const generated = batchInvoices.length;
                const collected = batchInvoices
                  .filter((i) => i.status === "Paid")
                  .reduce((sum, i) => sum + Number(i.total_amount), 0);
                const outst = batchInvoices
                  .filter((i) => i.status !== "Paid")
                  .reduce((sum, i) => sum + Number(i.total_amount), 0);
                return (
                  <tr
                    key={bk}
                    className="font-body-md text-body-md text-on-surface hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-label-md">
                      {bk}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-on-surface">
                        {generated}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                      {formatCurrency(collected)}
                    </td>
                    <td className="px-6 py-4 text-right text-rose-300 font-medium">
                      {formatCurrency(outst)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/admin/invoices"
                        className="font-label-sm text-label-sm text-primary hover:underline"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
