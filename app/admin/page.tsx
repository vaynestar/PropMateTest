import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { requireUser } from "@/lib/auth";
import KpiCard from "@/components/dashboard/KpiCard";
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

export default async function AdminDashboardPage() {
  await requireUser(["Admin"]);
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Dashboard
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Overview of your property portfolio and operations.
          </p>
        </div>
        <Link href="/admin/properties" className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 w-full md:w-auto transition-all">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Add Property
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-stack-lg">
        <KpiCard
          label="Total Properties"
          value={String(stats.totalProperties)}
          icon="domain"
          hint={`${stats.totalUnits} units managed`}
        />
        <KpiCard
          label="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon="home"
          accent="success"
          hint={`${stats.occupiedUnits} of ${stats.totalUnits} occupied`}
        />
        <KpiCard
          label="Outstanding (Unpaid)"
          value={formatCurrency(stats.outstandingAmount)}
          icon="payments"
          accent="warning"
          hint={`${stats.unpaidInvoices} unpaid invoices`}
        />
        <KpiCard
          label="Open Tickets"
          value={String(stats.openTickets)}
          icon="support_agent"
          accent="danger"
          hint={`${stats.totalTenants} residents`}
        />
      </div>

      {/* Occupancy Breakdown */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="font-title-lg text-title-lg text-on-surface mb-4">
          Unit Occupancy
        </h2>
        <div className="flex flex-col gap-4">
          <OccupancyRow label="Occupied" value={stats.occupiedUnits} total={stats.totalUnits} color="bg-emerald-400" />
          <OccupancyRow label="Vacant" value={stats.vacantUnits} total={stats.totalUnits} color="bg-surface-container-highest" />
          <OccupancyRow label="Maintenance" value={stats.maintenanceUnits} total={stats.totalUnits} color="bg-amber-400" />
        </div>
      </div>

      {/* Two-column: recent tickets + recent invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg">
        {/* Recent Tickets */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent Maintenance Tickets
            </h2>
            <Link
              href="/admin/maintenance"
              className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-outline-variant/30">
            {stats.recentTickets.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant py-4">
                No maintenance tickets yet.
              </p>
            )}
            {stats.recentTickets.map((t) => (
              <div key={t.ticket_id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="font-body-md text-body-md text-on-surface truncate">
                    {t.title}
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    {formatDate(t.created_at)} · {t.priority}
                  </div>
                </div>
                <StatusBadge status={t.status} variant="ticket" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent Invoices
            </h2>
            <Link
              href="/admin/invoices"
              className="font-label-md text-label-md text-primary hover:text-primary-container transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-outline-variant/30">
            {stats.recentInvoices.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant py-4">
                No invoices generated yet.
              </p>
            )}
            {stats.recentInvoices.map((inv) => (
              <div key={inv.invoice_id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="font-body-md text-body-md text-on-surface truncate">
                    {inv.invoice_no}
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    Due {formatDate(inv.due_date)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-body-md text-body-md text-on-surface">
                    {formatCurrency(Number(inv.total_amount))}
                  </span>
                  <StatusBadge status={inv.status} variant="invoice" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OccupancyRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="font-body-md text-body-md text-on-surface-variant">
          {label}
        </span>
        <span className="font-label-md text-label-md text-on-surface">
          {value} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
