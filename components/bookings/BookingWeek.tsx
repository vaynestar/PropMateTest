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
  lease?: { unit?: { unit_number?: string } | null } | null;
};

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
                    <span
                      key={j}
                      title={here
                        .map(
                          (b) =>
                            `${hhmm(b.start_time)}–${hhmm(b.end_time)} · ${
                              b.lease?.unit?.unit_number ?? "no unit"
                            } · ${b.booking_status}`
                        )
                        .join("\n")}
                      className={`min-h-[44px] overflow-hidden rounded-lg border px-1.5 py-1 ${tone}`}
                    >
                      <span className="block text-[11px] font-bold tabular-nums">
                        {hhmm(here[0].start_time)}–{hhmm(here[0].end_time)}
                      </span>
                      <span className="mt-px block truncate text-[10px] text-on-surface-variant">
                        {clash
                          ? "double-booked"
                          : here.length > 1
                          ? `+${here.length - 1} more`
                          : here[0].lease?.unit?.unit_number ?? "no unit"}
                      </span>
                    </span>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
