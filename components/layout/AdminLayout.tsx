import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminMobileNav, { AdminMenuButton } from "./AdminMobileNav";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";
import { getAdminNotifications } from "@/lib/notifications";
import NotificationCenter from "./NotificationCenter";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [user, notifications] = await Promise.all([
    getSessionUser(),
    getAdminNotifications(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop sticky top-0 z-40 w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50">
        {/* Brand / Logo */}
        <Link href="/admin" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="PropMate Logo"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-contain shadow-sm group-hover:scale-105 transition-transform"
            priority
          />
          <div>
            <div className="font-headline-md text-headline-md font-bold text-on-surface leading-none">
              PropMate
            </div>
            <div className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
              Admin Suite
            </div>
          </div>
        </Link>

        {/* Right Navigation & Header Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Center Popover */}
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

          {/* User Details & Profile Pill */}
          <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-outline-variant/40">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {user?.user_name ? user.user_name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">
                {user?.user_name ?? "Admin"}
              </span>
              <span className="text-[10px] text-on-surface-variant uppercase font-medium">
                {user?.role ?? "Administrator"}
              </span>
            </div>
          </div>

          {/* Logout Action Button */}
          <form action={logoutAction} className="ml-1">
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

          {/* Mobile Drawer Menu Button */}
          <AdminMenuButton />
        </div>
      </header>

      <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-24 md:pb-28">
        <div className="max-w-container-max mx-auto">{children}</div>
      </main>

      <AdminMobileNav />
    </div>
  );
}
