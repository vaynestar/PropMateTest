export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen flex w-full">
      {/* SideNavBar */}
      <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-[260px] bg-surface-container-lowest border-r border-outline-variant py-stack-lg transition-all duration-300 ease-in-out z-50">
        <div className="px-gutter mb-8">
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">PROPMATE</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Property Management</p>
        </div>
        <ul className="flex-1 flex flex-col gap-2 px-4">
          <li className="">
            <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary font-bold border-l-4 border-primary bg-primary/10 transition-colors duration-200" href="/admin">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </a>
          </li>
          <li className="group">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">domain</span>
                <span className="font-body-md text-body-md">Properties</span>
              </div>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
            <ul className="ml-11 mt-1 flex flex-col gap-1">
              <li className=""><a href="#" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Units</a></li>
              <li className=""><a href="#" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Leases</a></li>
            </ul>
          </li>
          <li className="group">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">payments</span>
                <span className="font-body-md text-body-md">Billing</span>
              </div>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
            <ul className="ml-11 mt-1 flex flex-col gap-1">
              <li className=""><a href="#" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Invoices</a></li>
            </ul>
          </li>
          <li className="group">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">home_repair_service</span>
                <span className="font-body-md text-body-md">Facilities</span>
              </div>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </div>
            <ul className="ml-11 mt-1 flex flex-col gap-1">
              <li className=""><a href="#" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Maintenance Schedule</a></li>
              <li className=""><a href="#" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Bookings</a></li>
            </ul>
          </li>
          <li className="">
            <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined">support_agent</span>
              <span className="font-body-md text-body-md">Helpdesk Support</span>
            </a>
          </li>
          <li className="">
            <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined">person_search</span>
              <span className="font-body-md text-body-md">Visitors</span>
            </a>
          </li>
          <li className="">
            <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined">campaign</span>
              <span className="font-body-md text-body-md">Announcements</span>
            </a>
          </li>
          <li className="">
            <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-body-md text-body-md">Reports</span>
            </a>
          </li>
          <li className="">
            <a className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="#">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md text-body-md">Settings</span>
            </a>
          </li>
        </ul>
        <div className="px-gutter mt-auto flex items-center gap-3 pt-6 border-t border-outline-variant/30">
          <img alt="Admin profile avatar" className="w-10 h-10 rounded-full object-cover border border-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4MqnyNttqgmByuthdYZZOfjLgvQoUnOrZzHD748Pr_7aWD1mCxVpKANeozW_hy2lEiwB6u_3GaLWuhWmxubwiduMX-BFX6-n6l-0K2j6kGKnkTVMAEeaP9DVlUmg0FKvpg42UhTLU3iYtxu2AZ-m916pji_yQXs5zqccxx8WntvV9usU_Xo5vOrw6U3zx-7IvFwSBtLvJGoKNos3kcUaMNVw-JbEKcBXvxj5DUI52xk8GWN5N6lUO" />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">Admin User</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">View Profile</span>
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="flex justify-between items-center px-margin-desktop h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50 shadow-sm sticky top-0 z-40 w-full">
          <div className="flex items-center md:hidden">
            <button className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all focus-within:ring-2 focus-within:ring-primary/50">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md items-center bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <span className="material-symbols-outlined text-on-surface-variant mr-2 text-sm">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-body-md font-body-md w-full text-on-surface placeholder-on-surface-variant/50 outline-none" placeholder="Search..." type="text" />
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all focus-within:ring-2 focus-within:ring-primary/50 relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all focus-within:ring-2 focus-within:ring-primary/50">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
