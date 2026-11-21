"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ExpandableFormProps = {
  title: string;
  buttonLabel: string;
  children: ReactNode;
  /** No longer opens anything on load - see the note below. */
  defaultOpen?: boolean;
  /** One line under the dialog title, where the form needs a word of context. */
  subtitle?: string;
};

/**
 * "New visitor" and "Report a repair" open as a dialog (DEV-242; user,
 * 2026-11-21: "New visitor and new request from repair can make it as pop out
 * form as well").
 *
 * It used to expand inline, which has the same three faults the facility
 * booking had before DEV-239: the form pushes the list below it off the
 * screen, on a phone the first field can land below the fold with no sign
 * anything happened, and the only way out is to find the button again further
 * up the page. Every other "do a thing" surface in the resident portal is now
 * a dialog - booking, a repair thread, a bill - so this is the last one that
 * behaved differently.
 *
 * `defaultOpen` is accepted and ignored. It existed so the visitors page could
 * expand the form when the resident had no passes yet; as a dialog that would
 * mean a modal appearing unprompted on arrival, which is a worse welcome than
 * an empty list with a button above it.
 */
/**
 * Lets the form inside close the dialog once it has succeeded.
 *
 * The children are handed down from a server component, so a callback prop
 * cannot reach them - this is the only way across that boundary. Outside a
 * dialog it is a no-op, so a form using it still works anywhere else.
 */
const CloseContext = createContext<() => void>(() => {});

export function useCloseForm() {
  return useContext(CloseContext);
}

export default function ExpandableForm({
  title,
  buttonLabel,
  children,
  subtitle,
}: ExpandableFormProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-stack-md">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 self-start transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          add
        </span>
        {buttonLabel}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-outline-variant/60 bg-surface-container shadow-2xl animate-slide-up sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-3xl">
              {/* Sticky, so the way out never scrolls off the top. */}
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container/95 px-5 py-3.5 backdrop-blur">
                <div className="min-w-0">
                  <h2 className="font-title-lg text-title-lg text-on-surface">{title}</h2>
                  {subtitle && <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <CloseContext.Provider value={() => setOpen(false)}>{children}</CloseContext.Provider>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
