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
 * This adds three cues, all of which disappear when there is nothing more to
 * see: a fade at whichever edge has content beyond it, a "swipe" nudge on
 * touch devices until the first scroll, and arrow buttons on pointer devices
 * where swiping is not natural.
 */
export default function ScrollHint({
  children,
  className = "",
  label = "Swipe for more",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

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

    const onScroll = () => {
      measure();
      setHasScrolled(true);
    };
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

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(200, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const scrollable = !(atStart && atEnd);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="hide-scrollbar overflow-x-auto">
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

      {/* Arrows for mouse users, who cannot swipe. */}
      {scrollable && (
        <div className="pointer-events-none absolute inset-y-0 right-1 hidden items-center md:flex">
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Scroll right"
            className="pressable pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-high/90 text-on-surface shadow-lg transition-opacity disabled:opacity-0"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              chevron_right
            </span>
          </button>
        </div>
      )}
      {scrollable && !atStart && (
        <div className="pointer-events-none absolute inset-y-0 left-1 hidden items-center md:flex">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className="pressable pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-high/90 text-on-surface shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              chevron_left
            </span>
          </button>
        </div>
      )}

      {/* Touch nudge, retired once the person has worked it out. */}
      {scrollable && !hasScrolled && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 hidden items-center gap-1 text-[10px] font-semibold text-on-surface-variant/80 max-md:flex"
        >
          <span className="material-symbols-outlined text-[13px] leading-none">swipe_left</span>
          {label}
        </div>
      )}
    </div>
  );
}
