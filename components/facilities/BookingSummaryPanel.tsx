"use client";

import { useEffect, useRef, useState } from "react";
import { shortDate } from "@/lib/short-date";

export type ClashKind = "taken" | "out_of_bounds" | "max_exceeded" | "invalid" | null;

function clock12(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * "1 h 25 min", not "1.4166666666666667 h" (DEV-284).
 *
 * The duration was printed as a raw division, so any slot that was not a whole
 * number of hours showed its floating-point remainder to the resident — a
 * 12:00–1:25 booking read "(1.4166666666666667 h)". Reported from the admin
 * booking form on a phone.
 *
 * Under an hour reads as minutes alone, because "0 h 45 min" is a worse way to
 * say "45 min".
 */
function humanDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * The chosen slot, and whether it can be had (DEV-251).
 *
 * Shared by the resident booking sheet and the admin booking form so a clash
 * looks and reads the same in both. It was a quiet rose tint before, easy to
 * scroll past, with the real explanation in a modal that had to be dismissed
 * before you could act on it.
 *
 * Now the panel itself answers: red, an X, a shake, and a line saying what to
 * do. The shake replays on every NEW clash because the caller gives the panel
 * a key that changes; a shake that only ever fires once teaches nothing.
 */
export default function BookingSummaryPanel({
  date,
  start,
  end,
  clash,
  openTime,
  closeTime,
  maxHours,
  takenLabel,
}: {
  date: string;
  start: number;
  end: number;
  clash: ClashKind;
  openTime: string;
  closeTime: string;
  maxHours?: number | null;
  /** "10:00 AM – 11:00 AM" of the booking in the way, when we know it. */
  takenLabel?: string | null;
}) {
  const bad = clash !== null;

  const box = useRef<HTMLDivElement>(null);

  /* The shake is an arrival, not a state: it plays once per clash and then
     the panel sits still, so a red panel you have already seen is not
     permanently twitching while you read it. */
  const [shaking, setShaking] = useState(bad);
  useEffect(() => {
    if (!bad) return;
    setShaking(true);

    /*
     * ...and bring it into view, but only if it is not already on screen. The
     * sheet is taller than a phone, so a slot that went red while the
     * resident was up at the calendar turned red entirely off-screen - a
     * shake nobody watches teaches nothing. Scrolling a panel that is already
     * in front of them would just be the page moving for no reason.
     */
    const el = box.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const mostlyVisible = r.top >= 0 && r.bottom <= (window.innerHeight || 0);
      if (!mostlyVisible) {
        el.scrollIntoView({
          block: "center",
          behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      }
    }

    const t = setTimeout(() => setShaking(false), 700);
    return () => clearTimeout(t);
  }, [bad]);

  const message = (() => {
    switch (clash) {
      case "taken":
        return takenLabel
          ? `Someone already has this facility from ${takenLabel}. Please choose another time slot.`
          : "This time slot is not available. Please choose another time slot.";
      case "out_of_bounds":
        return `The facility is only open from ${openTime} to ${closeTime}. Please choose another time slot.`;
      case "max_exceeded":
        return `This facility can be booked for up to ${maxHours} hour${maxHours === 1 ? "" : "s"} at a time. Please shorten the booking.`;
      case "invalid":
        return "The end time has to be after the start time.";
      default:
        return null;
    }
  })();

  return (
    <div
      ref={box}
      role={bad ? "alert" : undefined}
      aria-live={bad ? "assertive" : "off"}
      className={`rounded-xl border px-4 py-3 transition-colors ${
        bad
          ? "border-rose-500 bg-rose-500/15 ring-1 ring-rose-500/40"
          : "border-primary/40 bg-primary/10"
      } ${shaking ? "animate-shake" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`material-symbols-outlined shrink-0 ${bad ? "text-rose-300" : "text-primary"}`}
        >
          {bad ? "cancel" : "check_circle"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface/80">
            Your booking
          </p>
          <p
            className={`text-base font-bold tabular-nums ${bad ? "text-rose-100 line-through decoration-rose-400/70" : "text-on-surface"}`}
          >
            {shortDate(date)}
            {" · "}
            {clock12(start)} – {clock12(end)}
            {end > start ? ` (${humanDuration(end - start)})` : ""}
          </p>
          {message && (
            <p className="mt-1.5 text-[13px] font-medium leading-snug text-rose-200">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
