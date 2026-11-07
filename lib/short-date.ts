const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-09-18" -> "Fri, 18 Sep" (or "Fri, 18 Sep 2026" with year). Built by
 * hand: newer ICU prints September as "Sept" in en-GB/en-MY (DEV-184).
 */
export function shortDate(iso: string, withYear = false): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}

/**
 * "30 Sep" / "30 Sep 2026" from a Date or any parsable string, in Malaysia
 * time. Same reason as above: ICU prints September as "Sept" (DEV-184), and
 * five places in Announcements were still doing it (DEV-202).
 */
export function dayMonth(value: Date | string | null | undefined, withYear = false): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(d)
    .split("-")
    .map(Number);
  const base = `${String(day).padStart(2, "0")} ${MONTHS[m - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

/** "Sep" for a Date or ISO string, read in Malaysia. */
export function monthShort(value: Date | string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const [, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(d)
    .split("-")
    .map(Number);
  return MONTHS[m - 1];
}

/** "Sep 2026". */
export function monthYear(value: Date | string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(d)
    .split("-")
    .map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "30 Sep, 14:05" - a moment, in Malaysia. */
export function dayMonthTime(value: Date | string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  });
  return `${dayMonth(d)}, ${time}`;
}

/**
 * How long something has been open, as a compact "20m" / "5h" / "3d".
 *
 * Computed on the server and passed down as a string, never recomputed in the
 * browser: `Date.now()` differs between the render on the server and the
 * hydration in the browser, and a value that crosses a minute or hour
 * boundary between the two is a hydration mismatch.
 */
export function durationSince(value: Date | string): string {
  const then = new Date(value).getTime();
  if (isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
