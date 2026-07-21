import Link from "next/link";
import { cookies } from "next/headers";
import { getDashboardStats } from "@/lib/dashboard";
import MaintenanceCostChart from "@/components/dashboard/MaintenanceCostChart";
import FilterableTicketQueue from "@/components/dashboard/FilterableTicketQueue";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;
  const stats = await getDashboardStats(propertyId);

  // Outstanding amount formatted logic
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
        {/* KPI 1: Upcoming Maintenance */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Upcoming Maintenance</span>
            <div className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">calendar_month</span> Next 30 Days
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">{stats.upcomingMaintenance}</span>
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,25 L20,15 L40,20 L60,5 L80,10 L100,0" fill="none" stroke="#d0bcff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Facilities */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#a3defe]/5 rounded-full blur-2xl group-hover:bg-[#a3defe]/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Facilities</span>
            <div className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">domain</span> All Properties
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">{stats.totalFacilities}</span>
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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter h-auto min-h-[500px]">
        {/* Maintenance Cost Graph (Col Span 8) */}
        <div className="xl:col-span-8 flex flex-col">
          <MaintenanceCostChart data={stats.maintenanceCosts} />
        </div>

        {/* Maintenance Queue and Quick Actions (Col Span 4) */}
        <div className="xl:col-span-4 flex flex-col gap-gutter max-h-[500px]">
          <div className="flex-1 min-h-[300px] overflow-hidden">
            <FilterableTicketQueue tickets={stats.openTicketsList} />
          </div>
          
          {/* Quick Actions Mini Panel */}
          <div className="glass-card rounded-xl p-5 flex flex-col gap-3 shrink-0">
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
