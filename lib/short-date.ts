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
