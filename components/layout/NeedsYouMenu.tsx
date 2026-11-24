"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * What the number is made of (DEV-281).
 *
 * The top bar said "18 need you" and linked to the dashboard, which does
 * not break the figure down anywhere. Reported exactly that way:
 *
 *   "Admin top have reminder 18 need me, in admin@propmate.com, i clicked
 *    it, redirect me to dashboard, but never show me what 18 is about, also
 *    if these are fixed will it reduce the number?"
 *
 * A count with no way to see its parts is not a prompt, it is an accusation.
 * This opens the arithmetic: every line says what it is, how many, and goes
 * straight to the screen that clears it.
 *
 * And yes — clearing them reduces it. The count is computed per request from
 * the two underlying queries, so verifying a slip or giving a ticket an owner
 * takes it down on the next page load. The footer says so, because "will it
 * go down?" was a fair question to have to ask.
 */

export type NeedsYouItem = {
  label: string;
  count: number;
  href: string;
  icon: string;
  /** What clearing one actually means. */
  how: string;
};

export default function NeedsYouMenu({ items, total }: { items: NeedsYouItem[]; total: number }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (total <= 0) return null;

  const live = items.filter((i) => i.count > 0);

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="pressable inline-flex h-10 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
      >
        <span className="material-symbols-outlined text-[17px]">warning</span>
        {total} need{total === 1 ? "s" : ""} you
        <span className="material-symbols-outlined text-[16px] leading-none">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-[330px] overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
        >
          <p className="border-b border-outline-variant/50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            {total} waiting on you, in this property
          </p>

          {live.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 border-b border-outline-variant/30 px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-container-high/60"
            >
              <span className="material-symbols-outlined shrink-0 text-[19px] text-rose-300">
                {i.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-on-surface">
                  {i.count} {i.label}
                </span>
                <span className="mt-px block text-[11px] leading-snug text-on-surface-variant">
                  {i.how}
                </span>
              </span>
              <span className="material-symbols-outlined shrink-0 text-[16px] text-on-surface-variant">
                chevron_right
              </span>
            </Link>
          ))}

          <p className="bg-surface-container px-4 py-2.5 text-[11px] leading-relaxed text-on-surface-variant">
            Clearing one takes the number down — it is counted fresh on every page load, not
            stored.
          </p>
        </div>
      )}
    </div>
  );
}
