"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav } from "@/lib/admin-nav";

export default function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="hidden md:flex w-[260px] h-screen fixed left-0 top-0 border-r border-outline-variant bg-surface-container-lowest flex-col py-stack-lg z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
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

      <div className="flex-1 flex flex-col gap-1 px-4">
        {adminNav.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className="flex flex-col gap-1">
              <Link
                href={item.href}
                className={`pressable flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  active
                    ? "text-primary font-bold border-l-4 border-primary bg-primary/10"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </Link>
              {item.children && active && (
                <div className="pl-10 flex flex-col gap-1 mb-1">
                  {item.children.map((child) => (
                    <Link
                        key={child.href}
                        href={child.href}
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
    </nav>
  );
}
