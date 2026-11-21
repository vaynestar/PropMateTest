"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The "⋯" menu on a list row (DEV-253).
 *
 * Every admin list had grown a strip of four to six 32px icon buttons with
 * tooltips — the only way to learn what any of them did was to hover one and
 * wait. On the invoice list they were: preview, issue, edit/lock, paid/unpaid
 * and void/restore, five of them, in a right-hand column that ran off the edge
 * of a laptop screen and was unreachable on a phone.
 *
 * The replacement is one NAMED button per row — the likeliest thing to do to
 * that row in its current state — and everything else in here, written out in
 * words. Destructive items sit last, separated, in red.
 *
 * Reused by invoices, units, tenants and leases, so it is generic: the caller
 * passes items and keeps its own handlers.
 */

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  /** Draws it last, separated, in red. */
  danger?: boolean;
  disabled?: boolean;
  /** Shown under the label when the item needs a caveat. */
  hint?: string;
};

export default function RowMenu({
  label,
  items,
  align = "right",
}: {
  /** For screen readers: "More actions for invoice INV-202611-010". */
  label: string;
  items: RowMenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Click away and Escape both close it. Without the first, an open menu
  // stayed open while the reader clicked a different row's menu, and two were
  // on screen at once.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
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

  const ordinary = items.filter((i) => !i.danger);
  const dangerous = items.filter((i) => i.danger);

  const row =
    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="pressable inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-white"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          more_horiz
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`animate-fade-in absolute top-[calc(100%+6px)] z-40 w-[260px] rounded-2xl border border-outline-variant bg-surface-container-highest p-1.5 shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {ordinary.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`${row} text-on-surface hover:bg-surface-container-high`}
            >
              <span className="font-medium">{item.label}</span>
              {item.hint && (
                <span className="text-[11px] leading-snug text-on-surface-variant">{item.hint}</span>
              )}
            </button>
          ))}

          {dangerous.length > 0 && ordinary.length > 0 && (
            <div className="mx-1 my-1.5 h-px bg-outline-variant/60" />
          )}

          {dangerous.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`${row} text-rose-300 hover:bg-rose-500/10`}
            >
              <span className="font-semibold">{item.label}</span>
              {item.hint && <span className="text-[11px] leading-snug text-rose-300/70">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
