"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * One modal shell for the admin portal (DEV-195). Every module had built its
 * own dialog with slightly different padding, a different close button and a
 * different header, so a "Manage ticket" box and a "Manage categories" box
 * looked like two different products.
 *
 * Escape and the backdrop close it; the page behind does not scroll.
 */
export default function Modal({
  title,
  subtitle,
  icon,
  badge,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  /** e.g. a ticket reference shown beside the title. */
  badge?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-outline-variant/70 bg-surface-container shadow-2xl sm:rounded-2xl ${width}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-low px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>}
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 truncate text-sm font-bold text-white sm:text-base">
                {title}
                {badge}
              </h2>
              {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/40 bg-surface-container-low px-4 py-3 sm:px-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
