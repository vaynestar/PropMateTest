"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav } from "@/lib/admin-nav";
import { logoutAction } from "@/app/logout/actions";

const BOTTOM_ITEMS = adminNav.slice(0, 5);

export default function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden text-on-surface hover:bg-surface-variant rounded-full p-2 transition-all"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-0 h-full w-[280px] max-w-[85%] bg-surface-container-lowest border-r border-outline-variant flex flex-col py-stack-lg animate-slide-in">
            <div className="px-6 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-on-primary">
                  P
                </div>
                <div>
                  <div className="font-headline-md text-headline-md font-bold text-on-surface">
                    PropMate
                  </div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">
                    Property Management
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-all"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
              {adminNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <div key={item.href} className="flex flex-col gap-1">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`pressable flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                        active
                          ? "text-primary font-bold border-l-4 border-primary bg-primary/10"
                          : "text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        {item.icon}
                      </span>
                      <span className="font-label-md text-label-md">
                        {item.label}
                      </span>
                    </Link>
                    {item.children && active && (
                      <div className="pl-10 flex flex-col gap-1 mb-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={`pressable py-1.5 font-label-md text-label-md transition-colors ${
                              pathname === child.href
                                ? "text-primary"
                                : "text-on-surface-variant hover:text-on-surface"
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <form action={logoutAction} className="px-4 pt-4 border-t border-outline-variant/50">
              <button
                type="submit"
                className="pressable w-full flex items-center justify-center gap-2 py-3 rounded-lg text-error-container border border-error-container/30 hover:bg-error-container/10 transition-all font-label-md text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Log out
              </button>
            </form>
          </nav>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 flex justify-around items-center h-20 pb-safe px-2">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pressable flex flex-col items-center justify-center w-full h-full ${
                active
                  ? "text-primary font-bold"
                  : "text-on-surface-variant hover:text-on-surface transition-colors"
              }`}
            >
              <span
                className="material-symbols-outlined mb-1"
                style={
                  active ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
