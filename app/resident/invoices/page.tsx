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

      <div className="flex flex-col gap-stack-md w-full">
        {invoices.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8 text-center">
            No invoices yet.
          </p>
        )}
        {invoices.map((inv) => (
          <div
            key={inv.invoice_id}
            className={`glass-card rounded-xl p-4 flex flex-col gap-3 text-left w-full ${
              inv.status === "Paid" ? "opacity-70" : ""
            }`}
          >
            <div className="flex justify-between items-start w-full">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Unit {inv.lease.unit.unit_number}
                </span>
                <span
                  className={`font-headline-md text-headline-md text-on-surface ${
                    inv.status === "Paid"
                      ? "line-through decoration-outline-variant"
                      : ""
                  }`}
                >
                  {formatCurrency(Number(inv.total_amount))}
                </span>
              </div>
              <StatusBadge status={inv.status} variant="invoice" />
            </div>
            <div className="flex justify-between items-center w-full mt-2 pt-3 border-t border-outline-variant/30">
              <span className="font-body-md text-body-md text-on-surface-variant">
                Due: {formatDate(inv.due_date)}
              </span>
              <span className="font-label-md text-label-md text-primary">
                {inv.invoice_no}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
