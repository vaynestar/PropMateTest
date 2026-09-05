import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logoutAction } from "@/app/logout/actions";
import AdminMobileNav, { AdminMenuButton } from "@/components/layout/AdminMobileNav";
import PropertySwitcher from "@/components/layout/PropertySwitcher";
import { getAdminNotifications } from "@/lib/notifications";
import { resolveActivePropertyId } from "@/lib/property-context";
import NotificationCenter from "@/components/layout/NotificationCenter";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const activePropertyId = cookieStore.get("propmate_property_id")?.value || "";

  const [properties, notifications] = await Promise.all([
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true, is_default: true },
      orderBy: { created_at: "asc" },
    }),
    getAdminNotifications(),
  ]);

  // Resolution lives in lib/property-context.ts so the switcher and every
  // module agree. The user's cookie outranks the is_default flag: the default
  // is a starting point, not a lock. Resolving the default first pinned the
  // switcher to it permanently — picking another property wrote the cookie, the
  // layout re-rendered, and the default won again, so switching did nothing
  // and modules reading the cookie disagreed with the header (fixed DEV-128).
  const hasValidUserCookie = properties.some((p) => p.property_id === activePropertyId);
  const safeActivePropertyId = resolveActivePropertyId(properties, activePropertyId) ?? "";

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen flex w-full">
      {/* SideNavBar (Desktop Only) */}
      <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-[260px] bg-surface-container-lowest border-r border-outline-variant py-stack-lg transition-all duration-300 ease-in-out z-50">
        <Link href="/admin" className="px-gutter mb-8 flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="PropMate Logo"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl object-contain shadow-[0_0_15px_rgba(123,87,231,0.4)] group-hover:scale-105 transition-transform"
            priority
          />
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface leading-none">Prop Mate</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Admin Command</p>
          </div>
        </Link>

        <ul className="flex-1 flex flex-col gap-2 px-4 overflow-y-auto hide-scrollbar">
          <li>
            <Link
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary font-bold border-l-4 border-primary bg-primary/10 transition-colors duration-200"
              href="/admin"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                dashboard
              </span>
              <span className="font-body-md text-body-md">Dashboard</span>
            </Link>
          </li>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="list-none flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">domain</span>
                <span className="font-body-md text-body-md">Properties</span>
              </div>
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
              <li>
                <Link href="/admin/properties" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <Link href="/admin/units" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Units
                </Link>
              </li>
              <li>
                <Link href="/admin/tenants" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Tenants
                </Link>
              </li>
              <li>
                <Link href="/admin/leases" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Leases
                </Link>
              </li>
            </ul>
          </details>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="list-none flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">payments</span>
                <span className="font-body-md text-body-md">Billing</span>
              </div>
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
              <li>
                <Link href="/admin/billing" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Billing Overview
                </Link>
              </li>
              <li>
                <Link href="/admin/invoices" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Billing Details
                </Link>
              </li>
              <li>
                <Link href="/admin/billing/charges" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Charge Masterfile
                </Link>
              </li>
              <li>
                <Link href="/admin/billing/recurring-charges" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Recurring Charges
                </Link>
              </li>
            </ul>
          </details>
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="list-none flex items-center justify-between px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined">apartment</span>
                <span className="font-body-md text-body-md">Facilities</span>
              </div>
              <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
              <li>
                <Link href="/admin/facilities" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Manage Facilities
                </Link>
              </li>
              <li>
                <Link href="/admin/bookings" className="block py-2 text-sm text-on-surface-variant hover:text-primary transition-colors">
                  Bookings
                </Link>
              </li>
            </ul>
          </details>
          <li>
            <Link
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200"
              href="/admin/maintenance"
            >
              <span className="material-symbols-outlined">support_agent</span>
              <span className="font-body-md text-body-md">Helpdesk</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200"
              href="/admin/visitors"
            >
              <span className="material-symbols-outlined">person_search</span>
              <span className="font-body-md text-body-md">Visitors</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200"
              href="/admin/announcements"
            >
              <span className="material-symbols-outlined">campaign</span>
              <span className="font-body-md text-body-md">Announcements</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200"
              href="/admin/reports"
            >
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-body-md text-body-md">Reports</span>
            </Link>
          </li>
          <li>
            <Link
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors duration-200"
              href="/admin/settings"
            >
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body-md text-body-md">Settings</span>
            </Link>
          </li>
        </ul>

        {/* User Info & Profile at bottom of sidebar */}
        <div className="px-gutter mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/30">
          <Link href="/admin/profile" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {user?.user_name ? user.user_name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                {user?.user_name ?? "Admin"}
              </span>
              <span className="text-[10px] text-on-surface-variant uppercase font-medium">
                {user?.role ?? "Administrator"}
              </span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Main Content Canvas */}
      {/* min-w-0 is load-bearing: as a flex item this defaults to
          min-width:auto, so it refuses to shrink below its content and the
          page grew wider than the phone viewport. body{overflow-x:hidden}
          then clipped the excess instead of letting it scroll, making that
          content unreachable — 365px of it on /admin/units. */}
      <div className="flex-1 min-w-0 ml-0 md:ml-[260px] flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50 shadow-sm sticky top-0 z-40 w-full">
          <div className="flex items-center md:hidden">
            <AdminMenuButton />
          </div>
          <div className="hidden md:flex items-center font-headline-sm text-headline-sm font-bold mr-4">
            PropMate
          </div>

          <div className="flex-1 flex items-center justify-start max-w-md">
            <PropertySwitcher properties={properties} activePropertyId={safeActivePropertyId} isValid={hasValidUserCookie} />
          </div>

          {/* Top Header Actions: Notifications, Settings & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Center */}
            <NotificationCenter initialNotifications={notifications} />

            {/* Direct Settings Shortcut */}
            <Link
              href="/admin/settings"
              className="text-on-surface-variant hover:text-white hover:bg-surface-variant rounded-full p-2 transition-all flex items-center justify-center"
              title="System Settings"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-[22px]">settings</span>
            </Link>

            {/* Logout Action Button */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-rose-950/40 hover:border-rose-500/50 hover:text-rose-300 border border-outline-variant/60 text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-all pressable shadow-xs"
                title="Sign out of PropMate"
                aria-label="Log out"
              >
                <span className="material-symbols-outlined text-[16px] text-rose-400">logout</span>
                <span className="hidden sm:inline">Logout</span>
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
