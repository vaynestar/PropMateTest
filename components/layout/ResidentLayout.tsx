"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { residentNav } from "@/lib/resident-nav";

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/resident" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex bg-surface text-on-surface">
      <nav className="hidden md:flex w-[240px] h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface-container-lowest flex-col py-stack-lg z-50">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-on-primary">
            P
          </div>
          <div>
            <div className="font-headline-md text-headline-md font-bold text-on-surface">
              PropMate
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant">
              Resident Portal
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1 px-4">
          {residentNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  active
                    ? "text-primary font-bold border-l-4 border-primary bg-primary/10"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop sticky top-0 z-40 w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50">
          <div className="font-title-md text-title-md text-on-surface md:hidden">
            PropMate
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-label-md text-label-md text-on-surface">
                  Resident
                </span>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  person
                </span>
              </div>
              <form action="/logout" method="post">
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
