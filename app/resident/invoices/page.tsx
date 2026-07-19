import { getSessionUser } from "@/lib/auth";
import { getResidentInvoices } from "@/lib/resident";
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

export default async function ResidentInvoicesPage() {
  const user = await getSessionUser();
  const invoices = await getResidentInvoices(user!.userId);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          My Invoices
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Your rental invoices and payment status.
        </p>
      </div>

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high/50">
              <tr className="font-label-sm text-label-sm text-on-surface-variant">
                <th className="px-6 py-3">Invoice No.</th>
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3">Issued</th>
                <th className="px-6 py-3">Due</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {invoices.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 font-body-md text-body-md text-on-surface-variant text-center"
                  >
                    No invoices yet.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr
                  key={inv.invoice_id}
                  className="font-body-md text-body-md text-on-surface"
                >
                  <td className="px-6 py-4 font-label-md">{inv.invoice_no}</td>
                  <td className="px-6 py-4">{inv.lease.unit.unit_number}</td>
                  <td className="px-6 py-4">{formatDate(inv.invoice_date)}</td>
                  <td className="px-6 py-4">{formatDate(inv.due_date)}</td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrency(Number(inv.total_amount))}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.status} variant="invoice" />
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
