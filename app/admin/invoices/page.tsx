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

async function markPaid(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);
  const id = String(formData.get("invoice_id"));
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/invoices`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_id: id }),
  });
  revalidatePath("/admin/invoices");
}

export default async function InvoicesDetailPage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;

  const invoices = await listInvoices(propertyId);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <Link
          href="/admin/billing"
          className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
        >
          ← Back to Billing
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">
          Invoice Details
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Itemised view of every generated invoice.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {invoices.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant glass-card rounded-xl p-8 text-center">
            No invoices yet.
          </p>
        )}
        {invoices.map((inv) => (
          <div
            key={inv.invoice_id}
            className="glass-card rounded-xl p-6 flex flex-col gap-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="font-title-lg text-title-lg text-on-surface">
                  {inv.invoice_no}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {inv.lease.unit.unit_number} ·{" "}
                  {inv.lease.unit.property.property_name} ·{" "}
                  {inv.lease.tenant.user_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-title-md text-title-md text-on-surface">
                  {formatCurrency(Number(inv.total_amount))}
                </span>
                <StatusBadge status={inv.status} variant="invoice" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="font-label-sm text-label-sm text-on-surface-variant border-b border-outline-variant/30">
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 px-4 text-right">Unit Price</th>
                    <th className="py-2 px-4 text-right">Qty</th>
                    <th className="py-2 pl-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {inv.details.map((d) => (
                    <tr
                      key={d.detail_id}
                      className="font-body-md text-body-md text-on-surface"
                    >
                      <td className="py-2 pr-4">{d.description}</td>
                      <td className="py-2 px-4 text-right">
                        {formatCurrency(Number(d.unit_price))}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {Number(d.quantity)}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        {formatCurrency(Number(d.total_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Issued {formatDate(inv.invoice_date)} · Due{" "}
                {formatDate(inv.due_date)}
              </span>
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
                  Settled
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
