"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-read this screen from the server (DEV-287).
 *
 * Asked for on Properties, Units, Residents and Billing: *"i added a new
 * entry but it wont reflect"*.
 *
 * Every create action already calls `revalidatePath`, and the list pages are
 * `force-dynamic` and read their rows straight from props rather than
 * freezing them in state — so the usual causes of a stale list are not
 * present, and the staleness could not be reproduced locally. This is
 * therefore a backstop, not the diagnosis: a second person adding a unit, a
 * tab left open while work happened elsewhere, or a client router cache that
 * outlived its revalidation all leave the same impression, and none of them
 * should require finding the reload button in the browser chrome.
 *
 * The Helpdesk has had one since DEV-280 and it reads well there; this is
 * that button, extracted so the five screens cannot drift apart.
 */
export default function RefreshButton({
  label = "Refresh",
  busyLabel = "Refreshing…",
  title,
  className = "",
}: {
  label?: string;
  busyLabel?: string;
  /** What a refresh would pick up, for the tooltip. */
  title?: string;
  className?: string;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setRefreshing(true);
        router.refresh();
        /*
         * `router.refresh()` is a transition with no completion callback
         * reachable from here, so the spinner runs on a timer. Long enough to
         * read as "it did something" — a button that looks inert is a button
         * people press twice.
         */
        setTimeout(() => setRefreshing(false), 900);
      }}
      disabled={refreshing}
      title={title ?? "Re-read this page from the server"}
      className={
        "pressable inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-xs font-semibold text-on-surface transition-colors hover:text-white disabled:opacity-50 " +
        className
      }
    >
      <span
        aria-hidden="true"
        className={`material-symbols-outlined text-[17px] ${refreshing ? "animate-spin-slow" : ""}`}
      >
        refresh
      </span>
      {refreshing ? busyLabel : label}
    </button>
  );
}
