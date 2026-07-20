"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/logout/actions";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  children?: { label: string; href: string }[];
};

type BottomNavProps = {
  primary: NavItem[];
  more: NavItem[];
  showLogout?: boolean;
};

export default function BottomNav({
  primary,
  more,
  showLogout = true,
}: BottomNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" || href === "/resident"
      ? pathname === href
      : pathname.startsWith(href);

  const tabs = [...primary];
  while (tabs.length < 4) {
    tabs.push({ label: "", href: "#", icon: "blank" });
  }
  const visibleTabs = tabs.slice(0, 4);

  return (
    <>
      <nav className="fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 flex justify-around items-stretch h-16 md:h-20 pb-safe px-2 md:px-4">
        {visibleTabs.map((item) =>
          item.icon === "blank" ? (
            <span key="spacer" className="flex-1" />
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`pressable flex flex-col items-center justify-center w-full h-full ${
                isActive(item.href)
                  ? "text-primary font-bold"
                  : "text-on-surface-variant hover:text-on-surface transition-colors"
              }`}
            >
              <span
                className="material-symbols-outlined mb-1"
                style={
                  isActive(item.href)
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>
          )
        )}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="pressable flex flex-col items-center justify-center w-full h-full text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined mb-1">apps</span>
          <span className="font-label-sm text-label-sm">More</span>
        </button>
      </nav>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant rounded-t-2xl animate-slide-up max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 pt-4 pb-2">
              <span className="font-title-lg text-title-lg text-on-surface">
                More
              </span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-all"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-4 pb-8 pt-2 flex flex-col gap-1">
              {more.map((item) => (
                <div key={item.href} className="flex flex-col gap-1">
                  <Link
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={`pressable flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-primary font-bold bg-primary/10"
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
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setSheetOpen(false)}
                      className="pressable py-1.5 pl-12 font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}
              {showLogout && (
                <form
                  action={logoutAction}
                  className="mt-2 px-0 border-t border-outline-variant/50 pt-3"
                >
                  <button
                    type="submit"
                    className="pressable w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error-container border border-error-container/30 hover:bg-error-container/10 transition-all font-label-md text-label-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      logout
                    </span>
                    Log out
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
