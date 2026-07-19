import type { ReactNode } from "react";
import SidebarNav from "./SidebarNav";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen flex bg-surface text-on-surface">
      <SidebarNav />

      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop sticky top-0 z-40 w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50">
          <div className="flex-1 flex items-center max-w-md">
            <div className="relative w-full focus-within:ring-2 focus-within:ring-primary/50 rounded-lg">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full bg-surface-container-high border-none rounded-lg pl-10 pr-4 py-2 text-on-surface placeholder:text-on-surface-variant font-body-md focus:ring-0 outline-none"
                placeholder="Search properties, units, tenants..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-all"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
              className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-all"
              aria-label="Help"
            >
              <span className="material-symbols-outlined">help</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-label-md text-label-md text-on-surface">
                  {user?.user_name ?? "Admin"}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {user?.role ?? "Administrator"}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  person
                </span>
              </div>
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
          </div>
        </header>

        <main className="flex-1 p-margin-mobile md:p-margin-desktop">
          <div className="max-w-container-max mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
