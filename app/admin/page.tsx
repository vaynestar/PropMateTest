import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import { getRecentTickets } from "@/lib/maintenance";
import { getRecentInvoices } from "@/lib/billing";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

const KPI_CARDS = [
  {
    key: "totalProperties",
    label: "Properties",
    icon: "domain",
    tint: "bg-cyan-500/10 border-cyan-500/30",
    iconTint: "text-cyan-300",
    isCurrency: false,
  },
  {
    key: "totalUnits",
    label: "Total Units",
    icon: "meeting_room",
    tint: "bg-primary/10 border-primary/30",
    iconTint: "text-primary",
    isCurrency: false,
  },
  {
    key: "occupiedUnits",
    label: "Occupied",
    icon: "lock_open",
    tint: "bg-emerald-500/10 border-emerald-500/30",
    iconTint: "text-emerald-300",
    isCurrency: false,
  },
  {
    key: "vacantUnits",
    label: "Vacant",
    icon: "meeting_room",
    tint: "bg-rose-500/10 border-rose-500/30",
    iconTint: "text-rose-300",
    isCurrency: false,
  },
  {
    key: "totalTenants",
    label: "Tenants",
    icon: "group",
    tint: "bg-indigo-500/10 border-indigo-500/30",
    iconTint: "text-indigo-300",
    isCurrency: false,
  },
  {
    key: "openTickets",
    label: "Open Tickets",
    icon: "build_circle",
    tint: "bg-amber-500/10 border-amber-500/30",
    iconTint: "text-amber-300",
    isCurrency: false,
  },
  {
    key: "overdueInvoices",
    label: "Overdue",
    icon: "warning",
    tint: "bg-rose-500/10 border-rose-500/30",
    iconTint: "text-rose-300",
    isCurrency: false,
  },
  {
    key: "monthlyRevenue",
    label: "Monthly Revenue",
    icon: "payments",
    tint: "bg-emerald-500/10 border-emerald-500/30",
    iconTint: "text-emerald-300",
    isCurrency: true,
  },
] as const;

export default async function AdminDashboardPage() {
  await requireUser(["Admin"]);
  const [stats, recentTickets, recentInvoices] = await Promise.all([
    getDashboardStats(),
    getRecentTickets(5),
    getRecentInvoices(5),
  ]);

  const occupancy = Math.round(stats.occupancyRate * 100);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Dashboard
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Portfolio overview across all your managed properties.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-stack-md">
        {KPI_CARDS.map((card) => {
          const value = stats[card.key as keyof typeof stats] as number;
          return (
            <div
              key={card.key}
              className={`glass-card rounded-xl p-stack-md border ${card.tint} flex flex-col gap-2`}
            >
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {card.label}
                </span>
                <span
                  className={`material-symbols-outlined ${card.iconTint}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {card.icon}
                </span>
              </div>
              <span className="font-display-md text-display-md text-on-surface">
                {card.isCurrency ? formatCurrency(value) : value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-md">
        <div className="glass-card rounded-xl p-stack-lg lg:col-span-1 flex flex-col items-center justify-center gap-4">
          <h2 className="font-title-lg text-title-lg text-on-surface self-start">
            Occupancy
          </h2>
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="var(--color-surface-container-high)"
                strokeWidth="4"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeDasharray={`${occupancy} ${100 - occupancy}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-display-lg text-on-surface">
                {occupancy}%
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                occupied
              </span>
            </div>
          </div>
          <div className="flex gap-6 font-label-sm text-label-sm">
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {stats.occupiedUnits} occupied
            </span>
            <span className="flex items-center gap-1 text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              {stats.vacantUnits} vacant
            </span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-stack-md lg:col-span-2 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Outstanding Revenue
            </h2>
            <span className="font-display-md text-display-md text-rose-300">
              {formatCurrency(stats.outstandingAmount)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/invoices"
              className="pressable bg-surface-container-high rounded-lg p-4 flex flex-col gap-1 hover:bg-surface-container-highest transition-colors"
            >
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Monthly Revenue
              </span>
              <span className="font-display-md text-display-md text-emerald-300">
                {formatCurrency(stats.monthlyRevenue)}
              </span>
            </Link>
            <Link
              href="/admin/invoices"
              className="pressable bg-surface-container-high rounded-lg p-4 flex flex-col gap-1 hover:bg-surface-container-highest transition-colors"
            >
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Overdue Invoices
              </span>
              <span className="font-display-md text-display-md text-rose-300">
                {stats.overdueInvoices}
              </span>
            </Link>
          </div>
          <Link
            href="/admin/billing"
            className="gradient-btn py-3 font-label-md text-label-md flex justify-center items-center gap-2"
          >
            View Billing
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-md">
        <div className="glass-card rounded-xl p-stack-md flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent Tickets
            </h2>
            <Link
              href="/admin/maintenance"
              className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentTickets.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                No tickets yet.
              </p>
            )}
            {recentTickets.map((t) => (
              <Link
                key={t.ticket_id}
                href="/admin/maintenance"
                className="pressable flex items-center justify-between gap-3 bg-surface-container-high rounded-lg p-3 hover:bg-surface-container-highest transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface truncate">
                    {t.title}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {t.lease.unit.unit_number} · {t.ticket_category}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded font-label-sm text-label-sm border whitespace-nowrap ${
                    t.status === "Open"
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                      : t.status === "In Progress"
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-emerald-400/20 text-emerald-300 border-emerald-400/40"
                  }`}
                >
                  {t.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-stack-md flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-title-lg text-title-lg text-on-surface">
              Recent Invoices
            </h2>
            <Link
              href="/admin/invoices"
              className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentInvoices.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                No invoices yet.
              </p>
            )}
            {recentInvoices.map((inv) => (
              <Link
                key={inv.invoice_id}
                href="/admin/invoices"
                className="pressable flex items-center justify-between gap-3 bg-surface-container-high rounded-lg p-3 hover:bg-surface-container-highest transition-colors"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface truncate">
                    {inv.invoice_no}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {inv.lease.unit.unit_number} · Due{" "}
                    {new Date(inv.due_date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-label-md text-label-md text-on-surface">
                    {formatCurrency(Number(inv.total_amount))}
                  </span>
                  <span
                    className={`px-2 py-1 rounded font-label-sm text-label-sm border whitespace-nowrap ${
                      inv.status === "Paid"
                        ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/40"
                        : inv.status === "Overdue"
                        ? "bg-rose-500/30 text-rose-200 border-rose-500/50"
                        : "bg-rose-400/20 text-rose-300 border-rose-400/40"
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
