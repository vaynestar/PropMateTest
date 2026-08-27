"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { residentNav } from "@/lib/resident-nav";
import BottomNav, { NavItem } from "./BottomNav";

const PRIMARY: NavItem[] = [
  { label: "Home", href: "/resident", icon: "home" },
  { label: "Invoices", href: "/resident/invoices", icon: "receipt_long" },
  { label: "Helpdesk", href: "/resident/maintenance", icon: "build_circle" },
  { label: "Facilities", href: "/resident/facilities", icon: "pool" },
];

const MORE: NavItem[] = [
  { label: "Notice Board", href: "/resident/announcements", icon: "campaign" },
  { label: "Visitors", href: "/resident/visitors", icon: "person_search" },
  { label: "My Unit", href: "/resident/unit", icon: "apartment" },
  { label: "Profile", href: "/resident/profile", icon: "person" },
];

export default function ResidentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/resident" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex bg-surface text-on-surface w-full max-w-full overflow-x-hidden">
      <nav className="hidden md:flex w-[240px] h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface-container-lowest flex-col py-stack-lg z-50">
        <div className="px-6 mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="PropMate Logo" width={36} height={36} className="w-9 h-9 rounded-xl object-contain" priority />
          <div>
            <div className="font-headline-md text-headline-md font-bold text-on-surface leading-none">
              PropMate
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant mt-1">
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

      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen min-w-0">
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

        <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-24 md:pb-6 min-w-0">
          <div className="max-w-container-max mx-auto min-w-0 w-full">{children}</div>
        </main>
      </div>

      <BottomNav primary={PRIMARY} more={MORE} />
    </div>
  );
}
