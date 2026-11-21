"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wraps a horizontally scrolling strip and says so.
 *
 * Several sections scroll sideways — wide tables, the category tabs, the
 * booking timeline — and nothing indicated it. On a desktop a scrollbar
 * eventually appears; on a phone there is none, so a table that continued past
 * the right edge looked like a table that had been cut off. People do not swipe
 * something they have no reason to think will move.
 *
 * Two cues, both of which disappear when there is nothing more to see: a fade
 * at whichever edge still has content, and an arrow button to move it. The
 * arrows show on touch as well as pointer devices — a phone user can swipe, but
 * still has to be told there is somewhere to swipe to.
 */
export default function ScrollHint({
  children,
  className = "",
  scrollTo = null,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * 0–1: a point in the scrollable content to centre, whenever the value
   * changes. The booking timeline uses it so the hour you just picked is
   * brought into view instead of sitting off the right edge (DEV-251, user:
   * "when select time, the who has booked this day, it wont auto scroll to
   * the time zone user choose").
   */
  scrollTo?: number | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 2px of slack: sub-pixel layout means scrollLeft rarely hits max exactly.
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(max <= 2 || el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;

    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, { passive: true });

    // Content can arrive or reflow after mount (a filter changing the rows,
    // fonts loading), so re-measure rather than trusting the first pass.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));

    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    const el = ref.current;
    if (!el || scrollTo === null || Number.isNaN(scrollTo)) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) return; // nothing to scroll: it already all fits
    const target = Math.max(0, Math.min(max, scrollTo * el.scrollWidth - el.clientWidth / 2));
    if (Math.abs(target - el.scrollLeft) < 8) return;
    const still = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target, behavior: still ? "auto" : "smooth" });
  }, [scrollTo]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(200, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const scrollable = !(atStart && atEnd);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain py-0.5">
        {children}
      </div>

      {/* Edge fades: only on the side that still has content. */}
      {!atStart && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent"
        />
      )}
      {!atEnd && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent"
        />
      )}

      {/* Arrows on every screen: a touch user can swipe, but still has to be
          told there is something to swipe to. */}
      {scrollable && (
        <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center">
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Scroll right"
            className="pressable pointer-events-auto z-10 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-high text-on-surface shadow-lg transition-opacity disabled:opacity-0"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              chevron_right
            </span>
          </button>
        </div>
      )}
      {scrollable && !atStart && (
        <div className="pointer-events-none absolute inset-y-0 left-1 flex items-center">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className="pressable pointer-events-auto z-10 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-high text-on-surface shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              chevron_left
            </span>
          </button>
        </div>
      )}

    </div>
  );
}
