"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveSlot = { start_min: number; end_min: number };

/** How often an open booking form re-reads the day while it is in front of you. */
const POLL_MS = 20_000;

/**
 * The bookings on one facility, on one day, kept current (DEV-251).
 *
 * The booking forms were drawn once from the server render and never looked
 * again, which produced four complaints at once:
 *
 *   - two phones both saw the same hour as free, and the one that lost the
 *     race was told so by a modal while its own grid still offered the slot;
 *   - a page opened earlier on another device stayed wrong indefinitely;
 *   - after a refusal there was nothing to do but press Confirm again;
 *   - after a successful booking the form still showed the slot as free.
 *
 * So the form now re-reads /api/bookings/slots when it opens, when the date
 * changes, when the tab comes back to the front, every 20 seconds while it is
 * visible, and immediately whenever the server refuses a slot.
 *
 * `initial` is the server-rendered day, used until the first read lands, so
 * the grid is never briefly empty.
 */
export function useLiveSlots(facilityId: string, date: string, initial: LiveSlot[]) {
  const [slots, setSlots] = useState<LiveSlot[]>(initial);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // The server render is the truth until our own read lands for THIS day.
  const fallback = useRef(initial);
  fallback.current = initial;

  /* A reply for a day the user has already moved away from must not land on
     the new day's grid. */
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!facilityId || !date) return;
    const mine = ++requestId.current;
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/bookings/slots?facilityId=${encodeURIComponent(facilityId)}&date=${encodeURIComponent(date)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (mine !== requestId.current) return;
      if (Array.isArray(data?.slots)) {
        setSlots(data.slots.map((s: LiveSlot) => ({ start_min: s.start_min, end_min: s.end_min })));
        setCheckedAt(typeof data.checkedAt === "string" ? data.checkedAt : new Date().toISOString());
      }
    } catch {
      /* Offline or a flaky connection: keep showing what we have. The server
         still refuses a real clash, so stale data here cannot double-book. */
    } finally {
      if (mine === requestId.current) setRefreshing(false);
    }
  }, [facilityId, date]);

  // Show the server's day for the new date straight away, then confirm it.
  useEffect(() => {
    setSlots(fallback.current);
    setCheckedAt(null);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [refresh]);

  return { slots, refresh, refreshing, checkedAt };
}

/** "checked a moment ago" / "checked 2 minutes ago" — written on the form. */
export function checkedLabel(checkedAt: string | null, refreshing: boolean): string {
  if (refreshing) return "Checking availability…";
  if (!checkedAt) return "Checking availability…";
  const secs = Math.max(0, Math.round((Date.now() - new Date(checkedAt).getTime()) / 1000));
  if (secs < 45) return "Availability checked a moment ago";
  const mins = Math.round(secs / 60);
  return `Availability checked ${mins} minute${mins === 1 ? "" : "s"} ago`;
}
