"use client";

import { useEffect, useState } from "react";

/**
 * Floating "back to top" button (user, 2026-09-17). Shows once the page has
 * scrolled about two screens' worth of content away from the top.
 *
 * `aboveBottomNav` lifts it clear of the resident bottom nav (shown at every
 * width for now - R7); the admin panel has no bottom bar.
 */
export default function BackToTop({ aboveBottomNav = false }: { aboveBottomNav?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`fixed right-4 z-40 w-11 h-11 rounded-full bg-primary text-on-primary shadow-lg shadow-black/40 flex items-center justify-center transition-all duration-200 md:right-8 ${
        aboveBottomNav
          ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-24"
          : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))] md:bottom-8"
      } ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}
    >
      <span className="material-symbols-outlined text-[22px]">arrow_upward</span>
    </button>
  );
}
