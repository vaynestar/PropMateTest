"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { residentNav } from "@/lib/resident-nav";

const BOTTOM_NAV = [
  { label: "Home", icon: "home", href: "/resident", fill: true },
  { label: "Invoices", icon: "receipt_long", href: "/resident/invoices" },
  { label: "Fixes", icon: "build_circle", href: "/resident/maintenance" },
  { label: "Bookings", icon: "event_seat", href: "/resident/facilities" },
  { label: "More", icon: "menu", href: "/resident/unit" },
];

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
                className={`pressable flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  active
                    ? "text-primary font-bold border-l-4 border-primary bg-primary/10"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop sticky top-0 z-40 w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/50">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container flex items-center justify-center md:hidden">
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface flex-1 text-center md:flex-none md:text-left">
            Welcome Home
          </h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hover:bg-surface-variant rounded-full p-2 transition-all text-on-surface"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container hidden md:flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
            <form action="/logout" method="post" className="hidden md:block">
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

        <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-24 md:pb-6">
          <div className="max-w-container-max mx-auto">{children}</div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 flex justify-around items-center h-20 pb-safe px-4">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`pressable flex flex-col items-center justify-center w-full h-full py-2 ${
                active
                  ? "text-primary font-bold border-t-2 border-primary bg-primary/5"
                  : "text-on-surface-variant hover:text-on-surface transition-colors"
              }`}
            >
              <span
                className="material-symbols-outlined mb-1"
                style={
                  active && item.fill
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
