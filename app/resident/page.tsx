import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData } from "@/lib/resident";
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

export default async function ResidentDashboardPage() {
  const user = await getSessionUser();
  const { lease } = await getResidentPortalData(user!.userId);

  if (!lease) {
    return (
      <div className="flex flex-col gap-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Welcome, {user?.user_name}
        </h1>
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl">
            info
          </span>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
            No active tenancy is linked to your account yet. Please contact your
            property manager for assistance.
          </p>
        </div>
      </div>
    );
  }

  const outstanding = lease.invoices
    .filter((i) => i.status !== "Paid")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);
  const openTickets = lease.tickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Welcome, {user?.user_name}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Here is what is happening at {lease.unit.unit_number},{" "}
          {lease.unit.property.property_name}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-stack-lg">
        <div className="glass-card rounded-xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Outstanding Balance
          </p>
          <p className="font-headline-md text-headline-md text-rose-300 mt-1">
            {formatCurrency(outstanding)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Open Tickets
          </p>
          <p className="font-headline-md text-headline-md text-amber-300 mt-1">
            {openTickets}
          </p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Monthly Rent
          </p>
          <p className="font-headline-md text-headline-md text-on-surface mt-1">
            {formatCurrency(Number(lease.unit.monthly_rent))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg">
        <div className="glass-card rounded-xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent Invoices
            </h2>
            <Link
              href="/resident/invoices"
              className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {lease.invoices.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant px-6 py-6">
                No invoices yet.
              </p>
            )}
            {lease.invoices.map((inv) => (
              <div
                key={inv.invoice_id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="font-label-md text-label-md text-on-surface">
                    {inv.invoice_no}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Due {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-label-md text-label-md text-on-surface">
                    {formatCurrency(Number(inv.total_amount))}
                  </span>
                  <StatusBadge status={inv.status} variant="invoice" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent Tickets
            </h2>
            <Link
              href="/resident/maintenance"
              className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/30">
            {lease.tickets.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant px-6 py-6">
                No maintenance requests yet.
              </p>
            )}
            {lease.tickets.map((t) => (
              <div
                key={t.ticket_id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <p className="font-label-md text-label-md text-on-surface">
                    {t.title}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {formatDate(t.created_at)}
                  </p>
                </div>
                <StatusBadge status={t.status} variant="ticket" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
