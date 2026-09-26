/**
 * Booking clock times, in Malaysia time, wherever the code runs.
 *
 * `start_time` / `end_time` are real instants: the data holds UTC 10:00 for a
 * 6 pm slot. Writing them with `setHours()` only produced that instant because
 * the machine writing it was in Malaysia - on Vercel (UTC) the same call stored
 * a slot eight hours out, and reading them back with `getHours()` gave the
 * viewer's own timezone rather than the building's (R23, D-25).
 *
 * So: build instants with `bookingInstant()`, read them with `minutesMY()` or
 * `clockMY()`. Nothing in the booking path should call `setHours`, `getHours`
 * or a bare `toLocaleTimeString` again.
 */

const MY = "Asia/Kuala_Lumpur";

/** "HH:MM" (24 h) of an instant, read in Malaysia. */
export function clockMY(value: Date | string): string {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MY,
  });
}

/** Minutes since midnight of an instant, read in Malaysia. */
export function minutesMY(value: Date | string): number {
  const [h, m] = clockMY(value).split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight of an "HH:MM" string. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:MM" from minutes since midnight. */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  return `${String(h).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** The instant of `HH:MM` on `YYYY-MM-DD`, Malaysia time. */
export function bookingInstant(day: Date | string, time: string): Date {
  const date = typeof day === "string" ? day.slice(0, 10) : day.toISOString().slice(0, 10);
  const [h, m] = time.split(":").map(Number);
  const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return new Date(`${date}T${hhmm}:00+08:00`);
}

/** Today in Malaysia, as YYYY-MM-DD. */
export function todayMY(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: MY });
}

/** Weekday of a date in Malaysia, Monday = 1 ... Sunday = 7 (matches `operation_days`). */
export function weekdayMY(day: Date | string): number {
  const date = typeof day === "string" ? day.slice(0, 10) : day.toISOString().slice(0, 10);
  const js = new Date(`${date}T12:00:00+08:00`).getUTCDay(); // noon avoids any DST edge
  return js === 0 ? 7 : js;
}

/** Display form, e.g. "7:00 AM". */
export function displayClockMY(value: Date | string): string {
  const [h, m] = clockMY(value).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
