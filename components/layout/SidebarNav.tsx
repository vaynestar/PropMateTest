"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, type NavItem } from "@/lib/admin-nav";
import type { NavCounts } from "@/lib/nav-counts";

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

/**
 * What is waiting behind each destination (DEV-270).
 *
 * The point of a sidebar is to say where the work is BEFORE you click. This
 * one listed nine destinations and told you nothing about any of them, so
 * finding the five overdue invoices meant opening Billing, then Invoices,
 * then reading.
 *
 * Only where there IS work: every entry returns null at zero, because a
 * badge reading 0 is noise and nine of them is worse than none.
 */
function badgeFor(href: string, c?: NavCounts): { text: string; tone: "warn" | "bad" | "good" } | null {
  if (!c) return null;
  const at = (n: number, text: string, tone: "warn" | "bad" | "good" = "warn") =>
    n > 0 ? { text, tone } : null;

  switch (href) {
    case "/admin/units":
      return at(c.vacantUnits, `${c.vacantUnits} vacant`);
    case "/admin/leases":
      return at(c.leasesEnding, `${c.leasesEnding} ending`);
    case "/admin/invoices":
      return at(c.overdueInvoices, `${c.overdueInvoices} overdue`, "bad");
    case "/admin/billing":
      return at(c.slipsWaiting, `${c.slipsWaiting} slip${c.slipsWaiting === 1 ? "" : "s"}`);
    case "/admin/facilities":
      return at(c.facilitiesOverdue, `${c.facilitiesOverdue} overdue`, "bad");
    case "/admin/bookings":
      return at(c.bookingsToday, `${c.bookingsToday} today`, "good");
    case "/admin/maintenance":
      return at(c.openTickets, String(c.openTickets));
    case "/admin/visitors":
      return at(c.visitorsInside, `${c.visitorsInside} inside`, "good");
    default:
      return null;
  }
}

const BADGE_TONE = {
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  bad: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
} as const;

const DOT_TONE = {
  warn: "bg-amber-400",
  bad: "bg-rose-400",
  good: "bg-emerald-400",
} as const;

function Badge({ href, counts }: { href: string; counts?: NavCounts }) {
  const b = badgeFor(href, counts);
  if (!b) return null;
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-px text-[10.5px] font-bold tabular-nums ${BADGE_TONE[b.tone]}`}
    >
      {b.text}
    </span>
  );
}

/** A parent carries the worst of its children, so a collapsed section still speaks. */
function sectionBadge(item: NavItem, counts?: NavCounts) {
  const own = badgeFor(item.href, counts);
  if (own) return own;
  for (const c of item.children ?? []) {
    const b = badgeFor(c.href, counts);
    if (b) return b;
  }
  return null;
}

export default function SidebarNav({ counts }: { counts?: NavCounts }) {
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
                <span className="font-body-md text-body-md flex-1 min-w-0">{item.label}</span>
                <Badge href={item.href} counts={counts} />
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
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="material-symbols-outlined shrink-0">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </span>
                {/*
                  A collapsed parent gets a DOT, not the child's text. At 260px
                  "Properties · 10 vacant" forced the destination's own name to
                  truncate to "Prope…", and truncating the name to fit the
                  badge is the wrong way round. The dot says "there is work
                  behind this"; opening it says what.
                */}
                {(() => {
                  const b = sectionBadge(item, counts);
                  return b && !sectionActive ? (
                    <span
                      aria-label={b.text}
                      title={b.text}
                      className={`mr-2 h-[7px] w-[7px] shrink-0 rounded-full ${DOT_TONE[b.tone]}`}
                    />
                  ) : null;
                })()}
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
                        className={`flex items-center gap-2 rounded-md py-2 pl-2 pr-1.5 text-sm transition-colors ${
                          active
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                      >
                        <span className="min-w-0 flex-1">{child.label}</span>
                        <Badge href={child.href} counts={counts} />
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
