"use client";

import { useMemo, useState } from "react";

/**
 * The week, as a week (DEV-268, to the batch-3 `Bookings` artboard).
 *
 * **A booking screen exists so somebody can see what is free.** This one was
 * a list sorted by date, which answers that question only by being read in
 * full — and answers "does this clash with anything" not at all.
 *
 * Facilities down, days across. Every booking already on the page is
 * reused, so the grid costs no extra query: the list below and this grid
 * cannot disagree because they are the same rows.
 */

export type WeekBooking = {
  booking_id: string;
  booking_status: string;
  facility_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose?: string | null;
  pax_count?: number | null;
  lease?: {
    unit?: { unit_number?: string } | null;
    tenant?: { user_name?: string } | null;
  } | null;
  /** Who holds it — the only way to tell an office booking from a stray one. */
  heldBy?: { user_name?: string | null; role?: string | null } | null;
};

/**
 * What to show where a unit number would go (DEV-284).
 *
 * A booking with no tenancy is either the office holding the slot on purpose —
 * an AGM, a contractor, a deep clean — or an older resident row whose lease
 * link was never set. Calling the second "The office" would be wrong, so the
 * holder's role decides.
 */
function whoFor(b: WeekBooking, short = false): string {
  const unit = b.lease?.unit?.unit_number;
  if (unit) return unit;
  if (b.heldBy?.role === "Admin") return short ? "Office" : "The office";
  return b.heldBy?.user_name ?? (short ? "—" : "No unit");
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday of the week containing `d`, at local midnight. */
function mondayOf(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // getDay() is 0 for Sunday, and a Malaysian week starts on Monday.
  const shift = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - shift);
  return x;
}

/**
 * Do any two of these bookings actually overlap in time?
 *
 * Two bookings in one day cell is not a clash — the Badminton Court takes
 * 08:00–11:00 and 11:00–14:00 on the same afternoon and nothing is wrong.
 * Only a genuine overlap is worth a warning, so the slots are sorted by
 * start and each is checked against the latest end seen so far.
 */
function overlaps(rows: { start_time: string; end_time: string }[]) {
  if (rows.length < 2) return false;
  const slots = rows
    .map((r) => [new Date(r.start_time).getTime(), new Date(r.end_time).getTime()] as const)
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < slots.length; i++) {
    if (slots[i][0] < slots[i - 1][1]) return true;
  }
  return false;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kuala_Lumpur",
  });

export default function BookingWeek({
  facilities,
  bookings,
}: {
  facilities: { facility_id: string; facility_name: string }[];
  bookings: WeekBooking[];
}) {
  const [offset, setOffset] = useState(0);
  const [facilityFilter, setFacilityFilter] = useState("ALL");
  /*
   * A booked cell opens (user, 2026-11-24): "the calendar view should allow
   * user click on the booked slot and pop out to view details". A tooltip
   * only exists while the mouse is held still, says nothing at all on a
   * touch screen, and cannot be read aloud.
   */
  const [open, setOpen] = useState<{ facility: string; day: Date; rows: WeekBooking[] } | null>(
    null
  );

  const start = useMemo(() => {
    const m = mondayOf(new Date());
    m.setDate(m.getDate() + offset * 7);
    return m;
  }, [offset]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [start]
  );

  const rows = facilities.filter((f) => facilityFilter === "ALL" || f.facility_id === facilityFilter);
  const today = new Date();

  // Cancelled bookings do not hold a slot, so they must not make one look
  // taken. (Cancelled is also what "turned down" writes — see
  // lib/booking-status.ts, which knows three states and no "Rejected".)
  const live = bookings.filter((b) => b.booking_status !== "Cancelled");

  /*
   * Earliest first. The page fetches `orderBy: { start_time: "desc" }` for
   * the list below, which put the LAST booking of the day at the front of
   * the cell — a court taken 10:00–11:30 and 12:00–13:30 read "12:00–13:30
   * +1 more". A day reads forwards.
   */
  const cellFor = (facilityId: string, day: Date) =>
    live
      .filter((b) => b.facility_id === facilityId && sameDay(new Date(b.booking_date), day))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const weekLabel = `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" }
  )}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
      <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-3">
        <h2 className="text-[15px] font-bold text-on-surface">The week</h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous week"
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-high text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next week"
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-high text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          {offset !== 0 && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="pressable inline-flex h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-primary hover:underline"
            >
              This week
            </button>
          )}
        </div>
        <span className="text-xs tabular-nums text-on-surface-variant">{weekLabel}</span>

        <label
          htmlFor="week-facility"
          className="ml-auto text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
        >
          Facility
        </label>
        <select
          id="week-facility"
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="h-9 rounded-lg border border-outline-variant/60 bg-surface-container-high px-2.5 text-xs text-on-surface outline-none focus:border-primary"
        >
          <option value="ALL">Every facility</option>
          {facilities.map((f) => (
            <option key={f.facility_id} value={f.facility_id}>
              {f.facility_name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px] p-4">
          <div className="mb-2 grid grid-cols-[150px_repeat(7,minmax(0,1fr))] gap-1.5">
            <span />
            {days.map((d, i) => {
              const isToday = sameDay(d, today);
              return (
                <span
                  key={i}
                  className={`rounded-lg py-1 text-center ${isToday ? "bg-primary/12" : ""}`}
                >
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    {DOW[i]}
                  </span>
                  <span
                    className={`mt-0.5 block text-sm font-extrabold tabular-nums ${
                      isToday ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </span>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-xs text-on-surface-variant">
              No bookable facilities in this property.
            </p>
          ) : (
            rows.map((f, i) => (
              <div
                key={f.facility_id}
                className={`grid grid-cols-[150px_repeat(7,minmax(0,1fr))] gap-1.5 py-1.5 ${
                  i ? "border-t border-outline-variant/30" : ""
                }`}
              >
                <span className="flex items-center truncate pr-2 text-xs font-semibold text-on-surface-variant">
                  {f.facility_name}
                </span>
                {days.map((d, j) => {
                  const here = cellFor(f.facility_id, d);
                  if (here.length === 0) {
                    return (
                      <span
                        key={j}
                        className="min-h-[44px] rounded-lg border border-dashed border-outline-variant/40 bg-white/[0.012]"
                      />
                    );
                  }
                  /*
                   * A double-booked facility is the thing the old list could
                   * not show at all — the reason a booking screen exists.
                   * There is no third tone: a booking is Confirmed or it is
                   * Cancelled (lib/booking-status.ts), and Cancelled is
                   * already filtered out above.
                   */
                  const clash = overlaps(here);
                  const tone = clash
                    ? "border-rose-500/50 bg-rose-500/[0.14] text-rose-200"
                    : "border-primary/45 bg-primary/[0.12] text-primary";
                  return (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setOpen({ facility: f.facility_name, day: d, rows: here })}
                      aria-label={`${here.length} booking${here.length === 1 ? "" : "s"} for ${
                        f.facility_name
                      } on ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                      className={`pressable min-h-[44px] w-full overflow-hidden rounded-lg border px-1.5 py-1 text-left transition-colors hover:brightness-125 ${tone}`}
                    >
                      <span className="block text-[11px] font-bold tabular-nums">
                        {hhmm(here[0].start_time)}–{hhmm(here[0].end_time)}
                      </span>
                      <span className="mt-px block truncate text-[10px] text-on-surface-variant">
                        {clash
                          ? "double-booked"
                          : here.length > 1
                          ? `+${here.length - 1} more`
                          : whoFor(here[0], true)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#060a14]/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/50 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-bold text-on-surface">{open.facility}</h3>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {open.day.toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {" · "}
                  {open.rows.length} booking{open.rows.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="pressable inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-high text-on-surface-variant hover:text-white"
              >
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            </div>

            <div className="max-h-[52vh] divide-y divide-outline-variant/30 overflow-y-auto">
              {open.rows.map((b) => (
                <div key={b.booking_id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-bold tabular-nums text-on-surface">
                      {hhmm(b.start_time)}&ndash;{hhmm(b.end_time)}
                    </span>
                    <span className="shrink-0 rounded-full border border-outline-variant/60 bg-surface-container px-2 py-0.5 text-[10.5px] font-bold text-on-surface-variant">
                      {b.booking_status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {whoFor(b)}
                    {b.lease?.tenant?.user_name ? ` · ${b.lease.tenant.user_name}` : ""}
                    {b.pax_count ? ` · ${b.pax_count} ${b.pax_count === 1 ? "person" : "people"}` : ""}
                  </p>
                  {b.purpose && (
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant/80">
                      {b.purpose}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {overlaps(open.rows) && (
              <p className="border-t border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
                Two of these overlap in time. One of them has to move.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
