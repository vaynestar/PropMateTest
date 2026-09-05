"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, type NavItem } from "@/lib/admin-nav";

/**
 * Desktop sidebar navigation.
 *
 * The sidebar used to be hardcoded in app/admin/layout.tsx — a Server
 * Component — with the active styling baked onto the Dashboard link. That meant
 * Dashboard looked selected no matter which page you were on, and the markup
 * drifted from lib/admin-nav.ts, which only drove the mobile nav. Both now read
 * the same config, and the active item is derived from the URL.
 */

/** `/admin` must match exactly; everything else matches its subtree. */
function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A parent is open when it, or any of its children, is the current page. */
function sectionIsActive(pathname: string, item: NavItem) {
  if (isActive(pathname, item.href)) return true;
  return (item.children ?? []).some((c) => isActive(pathname, c.href));
}

export default function SidebarNav() {
  const pathname = usePathname() || "/admin";

  return (
    <ul className="hide-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto px-4">
      {adminNav.map((item) => {
        const hasChildren = !!item.children?.length;
        const sectionActive = sectionIsActive(pathname, item);

        if (!hasChildren) {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
                  active
                    ? "border-l-4 border-primary bg-primary/10 font-bold text-primary"
                    : "font-medium text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-body-md text-body-md">{item.label}</span>
              </Link>
            </li>
          );
        }

        return (
          <li key={item.href}>
            <details open={sectionActive} className="group [&_summary::-webkit-details-marker]:hidden">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 transition-colors duration-200 ${
                  sectionActive
                    ? "font-semibold text-white"
                    : "font-medium text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </span>
                <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">
                  expand_more
                </span>
              </summary>

              <ul className="ml-11 mt-1 flex flex-col gap-1 pb-2">
                {item.children!.map((child) => {
                  const active = isActive(pathname, child.href);
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-md py-2 pl-2 text-sm transition-colors ${
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                      >
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
