import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/logout/actions";
import AdminMobileNav, { AdminMenuButton } from "@/components/layout/AdminMobileNav";
import PropertySwitcher from "@/components/layout/PropertySwitcher";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  const cookieStore = await cookies();
  const activePropertyId = cookieStore.get("propmate_property_id")?.value || "";

  const properties = await prisma.propertyMaster.findMany({
    select: { property_id: true, property_name: true },
    orderBy: { created_at: "asc" },
  });

  const isValidProperty = properties.some((p) => p.property_id === activePropertyId);
  const safeActivePropertyId = isValidProperty ? activePropertyId : (properties[0]?.property_id ?? "");

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen flex w-full">
      {/* SideNavBar (Desktop Only) */}
      <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-[260px] bg-surface-container-lowest border-r border-outline-variant py-stack-lg transition-all duration-300 ease-in-out z-50">
        <div className="px-gutter mb-8">
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">PROPMATE</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Property Management</p>
        </div>
        <ul className="flex-1 flex flex-col gap-2 px-4 overflow-y-auto hide-scrollbar">
          <li>
            <Link className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary font-bold border-l-4 border-primary bg-primary/10 transition-colors duration-200" href="/admin">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </Link>
          </li>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="list-none flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">domain</span>
                <span className="font-body-md text-body-md">Properties</span>
              </div>
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
              <li><Link href="/admin/properties" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">All Properties</Link></li>
              <li><Link href="/admin/units" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Units</Link></li>
              <li><Link href="/admin/leases" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Leases</Link></li>
            </ul>
          </details>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="list-none flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">payments</span>
                <span className="font-body-md text-body-md">Billing</span>
              </div>
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
              <li><Link href="/admin/billing" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Billing Overview</Link></li>
              <li><Link href="/admin/invoices" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Invoice Details</Link></li>
              <li><Link href="/admin/billing/recurring-charges" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Recurring Charges</Link></li>
            </ul>
          </details>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="list-none flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">home_repair_service</span>
                <span className="font-body-md text-body-md">Facilities</span>
              </div>
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
              <li><Link href="/admin/facilities" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Manage Facilities</Link></li>
              <li><Link href="/admin/bookings" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">Bookings</Link></li>
            </ul>
          </details>
          <li>
            <Link className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="/admin/maintenance">
              <span className="material-symbols-outlined">support_agent</span>
              <span className="font-body-md text-body-md">Helpdesk Support</span>
            </Link>
          </li>
          <li>
            <Link className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="/admin/visitors">
              <span className="material-symbols-outlined">person_search</span>
              <span className="font-body-md text-body-md">Visitors</span>
            </Link>
          </li>
          <li>
            <Link className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="/admin/announcements">
              <span className="material-symbols-outlined">campaign</span>
              <span className="font-body-md text-body-md">Announcements</span>
            </Link>
          </li>
          <li>
            <Link className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="/admin/reports">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-body-md text-body-md">Reports</span>
            </Link>
          </li>
          <li>
            <Link className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200" href="/admin/profile">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md text-body-md">Settings</span>
            </Link>
          </li>
        </ul>
        <div className="px-gutter mt-auto flex items-center gap-3 pt-6 border-t border-outline-variant/30">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[20px]">person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">{user?.user_name ?? "Admin User"}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">View Profile</span>
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="flex justify-between items-center px-margin-desktop h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50 shadow-sm sticky top-0 z-40 w-full">
          <div className="flex items-center md:hidden">
            <AdminMenuButton />
          </div>
          <div className="hidden md:flex items-center font-headline-sm text-headline-sm font-bold mr-4">
             PropMate Admin
          </div>
          
          <div className="flex-1 flex items-center justify-start">
            <PropertySwitcher properties={properties} activePropertyId={safeActivePropertyId} isValid={isValidProperty} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-all relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-all"
                aria-label="Log out"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-24 md:pb-12 overflow-y-auto">
          <div className="max-w-container-max mx-auto">{children}</div>
        </main>
      </div>

      {/* Bottom Nav (Mobile Only) */}
      <div className="md:hidden">
        <AdminMobileNav />
      </div>
    </div>
  );
}
