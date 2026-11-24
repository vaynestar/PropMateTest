"use client";

import type { KeyboardEvent, MouseEvent } from "react";

/**
 * Make a whole table row open its record (DEV-280).
 *
 * Every admin list put the way in behind the `⋯` menu, or behind one small
 * link inside one cell. An admin's instinct is to click the row — the name,
 * the amount, the blank space next to it — and nothing happened. Reported
 * four times over: "Helpdesk need to allow if user click that row direct
 * open the ticket", "Visitor should allow user direct click the row", "all
 * module if table format should allow user to click and view details, not
 * follow ... to open details".
 *
 * Three things this has to get right, which is why it is shared rather than
 * written out seven times:
 *
 * 1. **A click on a control is not a click on the row.** Rows carry
 *    checkboxes, status selects, named buttons and the `⋯` menu. Clicking
 *    Check out must check out, not navigate; the closest-match test below
 *    lets those swallow their own clicks.
 * 2. **A text selection is not a click.** Dragging across a reference number
 *    to copy it used to fire the row's handler on mouse-up and throw the page
 *    away mid-copy.
 * 3. **The keyboard still works.** The row is a `button` to assistive tech,
 *    reachable by Tab, and Enter or Space opens it.
 *
 * Modifier-clicks and middle-clicks are left to the caller's own `<Link>`
 * where there is one, so "open in a new tab" keeps working.
 */

/** Anything that handles its own click and must not also open the row. */
const INTERACTIVE = "a,button,input,select,textarea,label,[role='button'],[role='menu'],[data-row-ignore]";

export function rowOpenProps(open: () => void, label?: string) {
  /*
   * `closest` walks up THROUGH the row, and the row itself carries
   * role="button" for assistive tech — so an unguarded closest() matched the
   * row on every click and swallowed all of them. The match only counts when
   * it is a descendant of the row, never the row itself.
   */
  const fromControl = (e: MouseEvent | KeyboardEvent) => {
    const hit = (e.target as HTMLElement | null)?.closest?.(INTERACTIVE);
    return !!hit && hit !== e.currentTarget;
  };

  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    className: "cursor-pointer",
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (fromControl(e)) return;
      // A drag that selected text is a copy, not a navigation.
      if ((window.getSelection()?.toString() ?? "").length > 0) return;
      open();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (fromControl(e)) return;
      e.preventDefault();
      open();
    },
  };
}
