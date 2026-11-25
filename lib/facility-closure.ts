/**
 * Temporarily closed: one definition, read by the guard and by every screen.
 *
 * User, 2026-11-25: *"can facilities add a temporary close option? like
 * badminton court, maybe it is bookable but temporary closed due to
 * mainteance or any other reason, so even if it appear on the list, but
 * grayed out with temporary closed, from what date to what date, time to
 * time"*.
 *
 * **A daily window, not one continuous block** (their choice): the facility is
 * shut between `closed_start_time` and `closed_end_time` on every day from
 * `closed_from` to `closed_until` inclusive, and bookable outside those hours.
 * A court closed for resurfacing from nine to six can still be taken at seven
 * in the evening. Both times null means whole days.
 *
 * No `server-only` import: the admin list, the resident booking sheet and
 * `createBooking` all need the same answer, and a facility that reads "closed"
 * on one screen and takes a booking on another is the bug this is meant to
 * prevent.
 */

export type FacilityClosure = {
  closed_from?: Date | string | null;
  closed_until?: Date | string | null;
  closed_start_time?: string | null;
  closed_end_time?: string | null;
  closure_reason?: string | null;
};

/** "HH:MM" to minutes since midnight. */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** A Date or ISO string as "YYYY-MM-DD" on the Malaysian calendar. */
function dayKey(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(value);
}

/** Has a closure been set at all? Both dates are required for a window. */
export function hasClosure(f: FacilityClosure): boolean {
  return !!(f.closed_from && f.closed_until);
}

/** Is `day` ("YYYY-MM-DD") inside the closed date range? */
export function closedOnDay(f: FacilityClosure, day: string): boolean {
  if (!hasClosure(f)) return false;
  const d = day.slice(0, 10);
  return d >= dayKey(f.closed_from!) && d <= dayKey(f.closed_until!);
}

/**
 * Does a booking of `start`–`end` minutes on `day` run into the closure?
 *
 * Touching at the edge is not a clash: a closure ending at 18:00 leaves 18:00
 * free, the same rule `isSlotTaken` already uses for back-to-back bookings
 * (user, item 19: "if a slot is booked from 8am to 9am, can 2nd person book
 * from 9am to 10am? it should allow").
 */
export function closureBlocks(
  f: FacilityClosure,
  day: string,
  start: number,
  end: number
): boolean {
  if (!closedOnDay(f, day)) return false;
  // No times recorded means the whole day is shut.
  if (!f.closed_start_time || !f.closed_end_time) return true;
  const from = toMinutes(f.closed_start_time);
  const to = toMinutes(f.closed_end_time);
  return start < to && end > from;
}

/** Every closed day in the range, as "YYYY-MM-DD", for greying out a calendar. */
export function closedDayList(f: FacilityClosure, limit = 120): string[] {
  if (!hasClosure(f)) return [];
  const out: string[] = [];
  const from = new Date(`${dayKey(f.closed_from!)}T00:00:00Z`);
  const until = new Date(`${dayKey(f.closed_until!)}T00:00:00Z`);
  // Only a whole-day closure removes a date from the calendar. A window that
  // leaves the evening open must stay pickable, or the resident can never book
  // the hours that are still free.
  if (f.closed_start_time && f.closed_end_time) return [];
  for (let d = from; d <= until && out.length < limit; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const DMY = (value: Date | string) =>
  new Date(`${dayKey(value)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** "1 Dec 2026 – 3 Dec 2026, 9:00 AM – 6:00 PM daily" — one line for a badge. */
export function closureLabel(f: FacilityClosure): string | null {
  if (!hasClosure(f)) return null;
  const sameDay = dayKey(f.closed_from!) === dayKey(f.closed_until!);
  const dates = sameDay ? DMY(f.closed_from!) : `${DMY(f.closed_from!)} – ${DMY(f.closed_until!)}`;
  if (!f.closed_start_time || !f.closed_end_time) return dates;
  const clock = (t: string) => {
    const m = toMinutes(t);
    const h = Math.floor(m / 60);
    return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };
  return `${dates}, ${clock(f.closed_start_time)} – ${clock(f.closed_end_time)}${
    sameDay ? "" : " daily"
  }`;
}

/** Is the closure in force right now? Used to grey a row today, not in future. */
export function closedNow(f: FacilityClosure, now = new Date()): boolean {
  const day = dayKey(now);
  if (!closedOnDay(f, day)) return false;
  if (!f.closed_start_time || !f.closed_end_time) return true;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= toMinutes(f.closed_start_time) && mins < toMinutes(f.closed_end_time);
}

/** Has the window passed entirely? The office can then clear it. */
export function closureExpired(f: FacilityClosure, now = new Date()): boolean {
  if (!hasClosure(f)) return false;
  return dayKey(now) > dayKey(f.closed_until!);
}
