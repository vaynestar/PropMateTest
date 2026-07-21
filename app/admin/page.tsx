import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { getRecentInvoices } from "@/lib/billing";
import { getRecentTickets } from "@/lib/maintenance";

// Helper to format currency
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Helper to get initials
function getInitials(name: string) {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Native date format (MMM d, yyyy)
function formatDate(dateStr: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

// Native distance to now (e.g. '2h ago', '1d ago')
function timeAgo(dateStr: Date | string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export default async function AdminDashboardPage() {
  const [stats, recentInvoices, recentTickets] = await Promise.all([
    getDashboardStats(),
    getRecentInvoices(5),
    getRecentTickets(4),
  ]);

  // Outstanding amount formatted logic (e.g. $42.5k or standard currency)
  const isK = stats.outstandingAmount >= 10000;
  const displayOutstanding = isK
    ? (stats.outstandingAmount / 1000).toFixed(1)
    : stats.outstandingAmount.toFixed(0);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-stack-lg gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Dashboard Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Real-time performance metrics across all properties.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary px-4 py-2 rounded text-secondary font-label-md text-label-md hover:bg-secondary/10 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">download</span> Generate Report
          </button>
          <Link href="/admin/properties" className="btn-primary px-4 py-2 rounded text-white font-label-md text-label-md hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <span className="material-symbols-outlined text-[18px]">add</span> Add Property
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        {/* KPI 1: Properties */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Properties</span>
            <div className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> Active
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">{stats.totalProperties}</span>
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,25 L20,15 L40,20 L60,5 L80,10 L100,0" fill="none" stroke="#d0bcff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 2: Occupancy Rate */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#a3defe]/5 rounded-full blur-2xl group-hover:bg-[#a3defe]/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Occupancy Rate</span>
            <div className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">pie_chart</span> {stats.occupiedUnits}/{stats.totalUnits} Units
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">{stats.occupancyRate}<span className="text-headline-md">%</span></span>
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,20 L25,18 L50,15 L75,10 L100,5" fill="none" stroke="#a3defe" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animationDelay: '0.1s' }}></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 3: Outstanding Balance */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-error/30 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-error/5 rounded-full blur-2xl group-hover:bg-error/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Outstanding Bal</span>
            <div className="bg-error/10 border border-error/20 text-error px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">warning</span> {stats.overdueInvoices} Overdue
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface"><span className="text-headline-md">$</span>{displayOutstanding}{isK && <span className="text-headline-md">k</span>}</span>
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,10 L20,15 L40,5 L60,20 L80,15 L100,25" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animationDelay: '0.2s' }}></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 4: Open Tickets */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-tertiary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Open Tickets</span>
            <div className="bg-surface-variant border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">build</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">{stats.openTickets}</span>
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,5 L25,10 L50,8 L75,15 L100,20" fill="none" stroke="#d2bbff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animationDelay: '0.3s' }}></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        {/* Recent Invoices (Col Span 8) */}
        <div className="xl:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-outline-variant/50 flex justify-between items-center">
            <h3 className="font-title-lg text-title-lg text-on-surface">Recent Invoices</h3>
            <Link href="/admin/billing" className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1">
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/50 border-b border-outline-variant/50 text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="py-4 px-6 font-semibold">Invoice #</th>
                  <th className="py-4 px-6 font-semibold">Tenant</th>
                  <th className="py-4 px-6 font-semibold">Amount</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/30">
                {recentInvoices.map((inv) => (
                  <tr key={inv.invoice_id} className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer">
                    <td className="py-4 px-6 font-mono text-sm group-hover:text-primary transition-colors">{inv.invoice_no}</td>
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-xs font-bold text-on-surface">
                        {getInitials(inv.lease?.tenant?.name || "Unknown User")}
                      </div>
                      {inv.lease?.tenant?.name || "Unknown"}
                    </td>
                    <td className="py-4 px-6 font-medium">{formatCurrency(Number(inv.total_amount))}</td>
                    <td className="py-4 px-6">
                      {inv.status === "Paid" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-[#a3defe]/10 border border-[#a3defe]/30 text-[#a3defe] text-xs font-medium">Paid</span>
                      ) : inv.status === "Overdue" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-error/10 border border-error/30 text-error text-xs font-medium">Overdue</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-secondary/10 border border-secondary/30 text-secondary text-xs font-medium">{inv.status}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">{formatDate(inv.invoice_date)}</td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant font-body-md">No recent invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Queue (Col Span 4) */}
        <div className="xl:col-span-4 flex flex-col gap-gutter">
          <div className="glass-card rounded-xl overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container/30">
              <h3 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">build</span> Maintenance Queue
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[360px]">
              {recentTickets.map((tkt) => (
                <div key={tkt.ticket_id} className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/50 hover:bg-surface-container-high hover:border-outline-variant transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate pr-2">{tkt.title}</h4>
                    {tkt.priority === "High" || tkt.priority === "Urgent" ? (
                      <span className="bg-error/10 text-error border border-error/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">{tkt.priority}</span>
                    ) : tkt.priority === "Medium" ? (
                      <span className="bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">Med</span>
                    ) : (
                      <span className="bg-surface-variant text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">Low</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span> 
                      {timeAgo(tkt.created_at)}
                    </span>
                    <span className="font-mono text-[10px]">{tkt.ticket_id.split("-")[0]}...</span>
                  </div>
                </div>
              ))}
              {recentTickets.length === 0 && (
                <div className="py-6 text-center text-on-surface-variant font-body-md">
                  No maintenance tickets found.
                </div>
              )}
            </div>
            <div className="p-3 border-t border-outline-variant/30 text-center">
              <Link href="/admin/maintenance" className="text-primary font-label-sm text-label-sm hover:underline w-full py-1 block">View All Tickets</Link>
            </div>
          </div>
          
          {/* Quick Actions Mini Panel */}
          <div className="glass-card rounded-xl p-5 flex flex-col gap-3">
            <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Quick Actions</h4>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-transparent hover:border-outline-variant transition-all text-on-surface text-left">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">campaign</span>
              </div>
              <span className="font-body-md font-medium">New Announcement</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-transparent hover:border-outline-variant transition-all text-on-surface text-left">
              <div className="w-8 h-8 rounded bg-secondary/20 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </div>
              <span className="font-body-md font-medium">Create Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

