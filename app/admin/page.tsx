export default function AdminDashboardPage() {
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
          <button className="btn-primary px-4 py-2 rounded text-white font-label-md text-label-md hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <span className="material-symbols-outlined text-[18px]">add</span> Add Property
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        {/* KPI 1 */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Properties</span>
            <div className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +2.4%
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">124</span>
            {/* Sparkline */}
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,25 L20,15 L40,20 L60,5 L80,10 L100,0" fill="none" stroke="#d0bcff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#a3defe]/5 rounded-full blur-2xl group-hover:bg-[#a3defe]/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Occupancy Rate</span>
            <div className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +0.8%
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">94<span className="text-headline-md">%</span></span>
            {/* Sparkline */}
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,20 L25,18 L50,15 L75,10 L100,5" fill="none" stroke="#a3defe" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animationDelay: '0.1s' }}></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-error/30 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-error/5 rounded-full blur-2xl group-hover:bg-error/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Outstanding Bal</span>
            <div className="bg-error/10 border border-error/20 text-error px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +5.2%
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface"><span className="text-headline-md">$</span>42.5<span className="text-headline-md">k</span></span>
            {/* Sparkline */}
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path className="sparkline-path" d="M0,10 L20,15 L40,5 L60,20 L80,15 L100,25" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animationDelay: '0.2s' }}></path>
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-tertiary/50 transition-colors">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Open Tickets</span>
            <div className="bg-surface-variant border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded flex items-center gap-1 font-label-sm text-[10px]">
              <span className="material-symbols-outlined text-[12px]">trending_down</span> -2
            </div>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display-lg text-display-lg text-on-surface">28</span>
            {/* Sparkline */}
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
            <button className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1">
              View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
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
                <tr className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 font-mono text-sm group-hover:text-primary transition-colors">INV-2023-1042</td>
                  <td className="py-4 px-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-xs font-bold text-on-surface">SJ</div>
                    Sarah Jenkins
                  </td>
                  <td className="py-4 px-6 font-medium">$2,450.00</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-[#a3defe]/10 border border-[#a3defe]/30 text-[#a3defe] text-xs font-medium">Paid</span>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant">Oct 12, 2023</td>
                </tr>
                <tr className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 font-mono text-sm group-hover:text-primary transition-colors">INV-2023-1043</td>
                  <td className="py-4 px-6 flex items-center gap-3">
                    <img alt="Tenant Avatar" className="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPRGzV9jaaealV8GzZhFfWOnPfLxJ5W5ofZ27s7ux7Gk0ooluPregbG1pm5ML2C3HFsqjBw6oVcVS3GwSQLNHmADyVat5D05ji2ObQYM2eDqw2QSauUIB2RXCUUBUefrL0v6ju9jNs48IfgaCVrBlyNu7p_utKOU_5OY3qareUyl5CEN-Kt8WMttmuISkj9XN9lw5dLNkuyLvpvNFiN6B_0t2n2hcfF8wlQL7jRDjEO6oOLLAhmp9O" />
                    Michael Chen
                  </td>
                  <td className="py-4 px-6 font-medium">$3,100.00</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-error/10 border border-error/30 text-error text-xs font-medium">Overdue</span>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant">Oct 10, 2023</td>
                </tr>
                <tr className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 font-mono text-sm group-hover:text-primary transition-colors">INV-2023-1044</td>
                  <td className="py-4 px-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-xs font-bold text-on-surface">AW</div>
                    Amanda Woods
                  </td>
                  <td className="py-4 px-6 font-medium">$1,850.00</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-secondary/10 border border-secondary/30 text-secondary text-xs font-medium">Pending</span>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant">Oct 15, 2023</td>
                </tr>
                <tr className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer border-b-0">
                  <td className="py-4 px-6 font-mono text-sm group-hover:text-primary transition-colors">INV-2023-1045</td>
                  <td className="py-4 px-6 flex items-center gap-3">
                    <img alt="Tenant Avatar" className="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUyDhVC_TLSNU2HSd7liJriYNBV5GDTl4CMqlunB5LNEpsjnXEUZDZp_GIWfwfx2zZKnbT8EycKeVSiOAfgtTVF0qGKXTOGfLXej5D5zI3gI-sRl5_mtt0TMzF8CzO3oFRtQ3sb4WwTM1aXrNZSjpgUu5nwZYhJCUwY8R7Icrr1vraS4rIwKHy184AXZGaZYLqJqWoW4_8uTjB15Xuz9B11TaZwMvgk2IyesNZgMmOB_t7o867j8BY" />
                    Elena Rodriguez
                  </td>
                  <td className="py-4 px-6 font-medium">$4,200.00</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-[#a3defe]/10 border border-[#a3defe]/30 text-[#a3defe] text-xs font-medium">Paid</span>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant">Oct 14, 2023</td>
                </tr>
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
              {/* Ticket Item */}
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/50 hover:bg-surface-container-high hover:border-outline-variant transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate pr-2">HVAC Failure - Apt 4B</h4>
                  <span className="bg-error/10 text-error border border-error/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">High</span>
                </div>
                <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 2h ago</span>
                  <span className="font-mono text-[10px]">TKT-892</span>
                </div>
              </div>
              {/* Ticket Item */}
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/50 hover:bg-surface-container-high hover:border-outline-variant transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate pr-2">Leaking Faucet - Unit 12</h4>
                  <span className="bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">Med</span>
                </div>
                <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 5h ago</span>
                  <span className="font-mono text-[10px]">TKT-891</span>
                </div>
              </div>
              {/* Ticket Item */}
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/50 hover:bg-surface-container-high hover:border-outline-variant transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate pr-2">Elevator B Malfunction</h4>
                  <span className="bg-error/10 text-error border border-error/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">High</span>
                </div>
                <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 1d ago</span>
                  <span className="font-mono text-[10px]">TKT-888</span>
                </div>
              </div>
              {/* Ticket Item */}
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/50 hover:bg-surface-container-high hover:border-outline-variant transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-body-md text-body-md font-semibold text-on-surface truncate pr-2">Paint Touchup - Lobby</h4>
                  <span className="bg-surface-variant text-on-surface-variant border border-outline-variant px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase shrink-0">Low</span>
                </div>
                <div className="flex justify-between items-center text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> 2d ago</span>
                  <span className="font-mono text-[10px]">TKT-885</span>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-outline-variant/30 text-center">
              <button className="text-primary font-label-sm text-label-sm hover:underline w-full py-1">View All Tickets</button>
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
