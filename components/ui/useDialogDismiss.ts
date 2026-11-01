"use client";

import { useEffect } from "react";

/**
 * Escape closes the dialog, and the page behind it does not scroll.
 *
 * `components/admin/Modal` has always done this, but fourteen dialogs were
 * built by hand before it existed and none of them did — so Escape closed a
 * ticket and did nothing on "Edit property", and the page behind kept
 * scrolling under half the dialogs in the app. That is the functional half of
 * the consistency the rubric asks for, and it is four lines.
 *
 * Call it unconditionally, above any `if (!isOpen) return null` — the `open`
 * flag decides whether anything is bound, so the hook order never changes.
 *
 * Pair it with {@link backdropProps} on the full-screen backdrop element.
 */
export function useDialogDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
}

/**
 * Props for the backdrop: announce it as a dialog, and close when the click
 * landed on the backdrop itself rather than bubbling up from the card.
 */
export function backdropProps(onClose: () => void, label?: string) {
  return {
    role: "dialog" as const,
    "aria-modal": true,
    "aria-label": label,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
  };
}
