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

async function generateInvoices() {
  "use server";
  await requireUser(["Admin"]);
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/invoices`, {
    method: "POST",
  });
  revalidatePath("/admin/billing");
}

async function markPaid(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);
  const id = String(formData.get("invoice_id"));
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/invoices`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_id: id }),
  });
  revalidatePath("/admin/billing");
}

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
        <form action={generateInvoices}>
          <button
            type="submit"
            className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              autorenew
            </span>
            Generate Monthly Invoices
          </button>
        </form>
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

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Invoices
          </h2>
          <Link
            href="/admin/invoices"
            className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
          >
            View detail
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high/50">
              <tr className="font-label-sm text-label-sm text-on-surface-variant">
                <th className="px-6 py-3">Invoice No.</th>
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3">Tenant</th>
                <th className="px-6 py-3">Due</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {invoices.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 font-body-md text-body-md text-on-surface-variant text-center"
                  >
                    No invoices yet. Click "Generate Monthly Invoices" to create
                    them from occupied units.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr
                  key={inv.invoice_id}
                  className="font-body-md text-body-md text-on-surface"
                >
                  <td className="px-6 py-4 font-label-md">
                    {inv.invoice_no}
                  </td>
                  <td className="px-6 py-4">
                    {inv.lease.unit.unit_number}
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">
                      {inv.lease.unit.property.property_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">{inv.lease.tenant.user_name}</td>
                  <td className="px-6 py-4">
                    {formatDate(inv.due_date)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(Number(inv.total_amount))}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.status} variant="invoice" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status !== "Paid" ? (
                      <form action={markPaid}>
                        <input
                          type="hidden"
                          name="invoice_id"
                          value={inv.invoice_id}
                        />
                        <button
                          type="submit"
                          className="font-label-sm text-label-sm text-emerald-300 hover:underline"
                        >
                          Mark Paid
                        </button>
                      </form>
                    ) : (
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
