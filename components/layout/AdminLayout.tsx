import type { ReactNode } from "react";
import AdminMobileNav, { AdminMenuButton } from "./AdminMobileNav";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop sticky top-0 z-40 w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-on-primary">
            P
          </div>
          <div className="font-headline-md text-headline-md font-bold text-on-surface">
            PropMate
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
            <AdminMenuButton />
          </div>
        </div>
      </header>

      <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-24 md:pb-28">
        <div className="max-w-container-max mx-auto">{children}</div>
      </main>

      <AdminMobileNav />
    </div>
  );
}
