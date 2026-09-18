"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MediaItem = { src: string; title?: string; kind?: "image" | "doc" };

/**
 * Full-screen viewer inside the app (DEV-190; user: "After click and open the
 * image unable to go back in pwa"). An installed PWA has no browser back
 * button, so every `target="_blank"` link to a photo, receipt, PDF or print
 * page opened a new page the resident couldn't leave. This overlay keeps them
 * in PropMate: big Close button, Escape, swipe / arrows between photos, and
 * Print for documents.
 *
 * kind "image" -> <img>; "doc" -> <iframe> (PDFs, receipts, print pages).
 */
export default function MediaViewer({
  items,
  start = 0,
  onClose,
}: {
  items: MediaItem[];
  start?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const [mounted, setMounted] = useState(false);
  const touchX = useRef<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const item = items[i];
  const isDoc = item?.kind === "doc";
  const many = items.length > 1;

  const go = (d: number) => setI((n) => (n + d + items.length) % items.length);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && many) go(1);
      if (e.key === "ArrowLeft" && many) go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || !item) return null;

  const print = () => {
    try {
      frame.current?.contentWindow?.focus();
      frame.current?.contentWindow?.print();
    } catch {
      /* cross-origin or blocked - nothing else to do */
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={item.title || "Viewer"}
      // React events bubble through portals: without this, tapping Close would
      // also "tap" the card that opened the viewer.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-4 rounded-full bg-white/15 text-white font-semibold flex items-center gap-1.5 active:scale-95"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
          Close
        </button>
        <p className="flex-1 min-w-0 text-sm text-white/80 truncate text-center">
          {item.title}
          {many && <span className="text-white/50"> · {i + 1} / {items.length}</span>}
        </p>
        {isDoc ? (
          <button
            type="button"
            onClick={print}
            className="h-11 px-4 rounded-full bg-white/15 text-white font-semibold flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined">print</span>
            Print
          </button>
        ) : (
          <span className="w-[5.5rem]" aria-hidden />
        )}
      </div>

      <div
        className="relative flex-1 min-h-0 flex items-center justify-center pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => !isDoc && e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null || !many || isDoc) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {isDoc ? (
          <iframe ref={frame} key={item.src} src={item.src} title={item.title || "Document"} className="w-full h-full bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.src} src={item.src} alt={item.title || ""} className="max-w-full max-h-full object-contain select-none" />
        )}

        {many && !isDoc && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

/** A button that opens `items` in the viewer. Drop-in for `<a target="_blank">`. */
export function ViewerButton({
  items,
  start = 0,
  className,
  title,
  children,
}: {
  items: MediaItem[];
  start?: number;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={title}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && <MediaViewer items={items} start={start} onClose={() => setOpen(false)} />}
    </>
  );
}
