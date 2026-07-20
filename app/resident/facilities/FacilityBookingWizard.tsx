"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { bookFacility } from "./actions";

type Facility = {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  property: { property_name: string };
  max_capacity: number;
  operation_days: string;
  open_time: string;
  close_time: string;
};

type Booking = {
  booking_id: string;
  facility_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_status: string;
};

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DURATIONS = [1, 1.5, 2, 2.5];

function jsDayToMonFirst(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function fmt(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
function fmt12(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad(m)} ${period}`;
}
function dateToISO(d: Date): string {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
}

function nextOpenDates(openDays: Set<number>, count = 10): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < count) {
    if (openDays.has(jsDayToMonFirst(d.getDay()))) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-3 font-label-md text-label-md rounded-lg transition-all active:scale-95 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Confirm Booking"}
    </button>
  );
}

export default function FacilityBookingWizard({
  facilities,
  bookings,
}: {
  facilities: Facility[];
  bookings: Booking[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const facility = facilities.find((f) => f.facility_id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {/* Step 1: 2-column facility list */}
      <section>
        <h2 className="font-title-md text-title-md text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">
            meeting_room
          </span>
          Choose a facility
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {facilities.map((f) => {
            const active = f.facility_id === selectedId;
            return (
              <button
                key={f.facility_id}
                type="button"
                onClick={() => setSelectedId(f.facility_id)}
                className={`glass-card rounded-xl p-5 text-left transition-all active:scale-[0.98] ${
                  active
                    ? "border-2 border-primary"
                    : "border border-outline-variant hover:border-primary/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    sports_tennis
                  </span>
                  <div>
                    <p className="font-title-sm text-title-sm text-on-surface">
                      {f.facility_name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {f.facility_type} · {f.open_time}–{f.close_time}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {facility && (
        <BookingPanel key={facility.facility_id} facility={facility} bookings={bookings} />
      )}
    </div>
  );
}

function BookingPanel({ facility, bookings }: { facility: Facility; bookings: Booking[] }) {
  const openDays = useMemo(
    () =>
      new Set(
        facility.operation_days
          .split(",")
          .map((d) => Number(d.trim()))
          .filter((n) => n >= 1 && n <= 7)
      ),
    [facility.operation_days]
  );

  const DAY_START = toMinutes(facility.open_time);
  const DAY_END = toMinutes(facility.close_time);
  const TOTAL = DAY_END - DAY_START;

  const openDates = useMemo(() => nextOpenDates(openDays, 10), [openDays]);
  const [date, setDate] = useState<string>(dateToISO(openDates[0]));

  const dayBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.facility_id === facility.facility_id &&
            b.booking_date === date &&
            b.booking_status !== "Cancelled"
        )
        .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)),
    [bookings, facility.facility_id, date]
  );

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let m = DAY_START; m < DAY_END; m += 60) out.push(m);
    return out;
  }, [DAY_START, DAY_END]);

  const [startHour, setStartHour] = useState<number>(DAY_START);
  const [startMin, setStartMin] = useState<number>(0);
  const [duration, setDuration] = useState<number | null>(null);

  const startMin_total = startHour + startMin;
  const endMin =
    duration !== null ? Math.round(startMin_total + duration * 60) : startMin_total;

  const clash = useMemo(() => {
    if (duration === null) return null;
    for (const b of dayBookings) {
      const bs = toMinutes(b.start_time);
      const be = toMinutes(b.end_time);
      if (startMin_total < be && endMin > bs) {
        return b;
      }
    }
    return null;
  }, [dayBookings, startMin_total, endMin, duration]);

  const invalidRange = duration !== null && endMin > DAY_END;

  const segments = dayBookings.map((b) => {
    const s = Math.max(DAY_START, toMinutes(b.start_time));
    const e = Math.min(DAY_END, toMinutes(b.end_time));
    return {
      left: ((s - DAY_START) / TOTAL) * 100,
      width: ((e - s) / TOTAL) * 100,
      label: `${b.start_time}–${b.end_time}`,
      booked: true,
    };
  });

  if (duration !== null && !invalidRange) {
    segments.push({
      left: ((startMin_total - DAY_START) / TOTAL) * 100,
      width: ((endMin - startMin_total) / TOTAL) * 100,
      label: `${fmt(startMin_total)}–${fmt(endMin)}`,
      booked: false,
    });
  }

  const cols = Math.max(1, Math.round(TOTAL / 60));

  return (
    <section className="glass-card rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-title-md text-title-md text-on-surface">
          {facility.facility_name}
        </h3>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {facility.property.property_name} · Capacity {facility.max_capacity}
        </span>
      </div>

      {/* Step 2: date strip (open days only) */}
      <div>
        <p className="font-label-md text-label-md text-on-surface mb-2">Pick a date</p>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {openDates.map((d) => {
            const iso = dateToISO(d);
            const active = iso === date;
            const label = d.toLocaleDateString("en-MY", { weekday: "short" });
            const dayNum = d.getDate();
            const isToday = iso === dateToISO(new Date());
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDate(iso)}
                className={`shrink-0 min-w-[72px] flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all active:scale-95 ${
                  active
                    ? "border-primary bg-primary/10 text-on-surface"
                    : "border-outline-variant bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span className="font-label-sm text-label-sm">
                  {isToday ? "Today" : label}
                </span>
                <span className="font-title-md text-title-md">{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability bar */}
      <div>
        <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
          <span>{fmt(DAY_START)}</span>
          <span>Availability · {date}</span>
          <span>{fmt(DAY_END)}</span>
        </div>
        <div className="relative h-12 rounded-lg bg-surface-container-high overflow-hidden border border-outline-variant">
          <div className="absolute inset-0 flex">
            {Array.from({ length: cols }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-outline-variant/30 last:border-r-0"
              />
            ))}
          </div>
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`absolute top-0 h-full flex items-center justify-center border-x ${
                seg.booked
                  ? "bg-error-container/70 border-error-container"
                  : "bg-primary/40 border-primary"
              }`}
              style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
              title={seg.label}
            >
              <span className="font-label-sm text-label-sm text-on-surface px-1 truncate">
                {seg.label}
              </span>
            </div>
          ))}
          {segments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Fully available
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className="w-3 h-3 rounded-sm bg-error-container/70 inline-block" />
            Booked
          </span>
          <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <span className="w-3 h-3 rounded-sm bg-primary/40 inline-block border border-primary" />
            Your selection
          </span>
        </div>
      </div>

      {/* Step 3: start time */}
      <div>
        <p className="font-label-md text-label-md text-on-surface mb-2">
          Start time (hour + 5-min)
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 flex-1">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setStartHour(h)}
                className={`py-2 rounded-lg border text-sm font-label-md transition-all active:scale-95 ${
                  startHour === h
                    ? "border-primary bg-primary/10 text-on-surface"
                    : "border-outline-variant bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {fmt12(h)}
              </button>
            ))}
          </div>
          <select
            value={startMin}
            onChange={(e) => setStartMin(Number(e.target.value))}
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
            aria-label="Start minutes"
          >
            {MINUTE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                :{pad(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 4: duration */}
      <div>
        <p className="font-label-md text-label-md text-on-surface mb-2">
          Duration
        </p>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`px-5 py-3 rounded-full border font-label-md text-label-md transition-all active:scale-95 ${
                duration === d
                  ? "border-primary bg-primary/10 text-on-surface"
                  : "border-outline-variant bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {d} hr
            </button>
          ))}
        </div>
        {duration !== null && (
          <p className="font-label-md text-label-md text-on-surface-variant mt-2">
            {fmt12(startMin_total)} – {fmt12(endMin)}
          </p>
        )}
      </div>

      {/* Step 5: clash / confirm */}
      {clash && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-error-container">
            This slot clashes with an existing booking ({clash.start_time}–
            {clash.end_time}). Please choose another time.
          </span>
        </div>
      )}
      {invalidRange && !clash && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-error-container">
            Selected time goes beyond closing time ({facility.close_time}).
            Please choose another time.
          </span>
        </div>
      )}

      {duration !== null && !clash && !invalidRange && (
        <form action={bookFacility} className="flex justify-end">
          <input type="hidden" name="facility_id" value={facility.facility_id} />
          <input type="hidden" name="booking_date" value={date} />
          <input type="hidden" name="start_time" value={fmt(startMin_total)} />
          <input type="hidden" name="end_time" value={fmt(endMin)} />
          <SubmitButton />
        </form>
      )}
    </section>
  );
}
