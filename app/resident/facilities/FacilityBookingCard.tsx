"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { bookFacility } from "./actions";

const STEP = 5 * 60; // 5-minute interval for the time pickers (300s)

// Monday-first weekday map: JS getDay() is Sun=0..Sat=6, convert to Mon=1..Sun=7
function jsDayToMonFirst(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

// Returns array of the next N open dates (ISO) based on operation_days
function nextOpenDates(
  openDays: Set<number>,
  count = 60
): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count && out.length < 14; i++) {
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    if (openDays.has(jsDayToMonFirst(new Date(d).getDay()))) out.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

type Booking = {
  booking_id: string;
  booking_date: string | Date;
  start_time: string;
  end_time: string;
  booking_status: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-4 py-2 font-label-md text-label-md transition-all sm:col-span-2 disabled:opacity-60"
    >
      {pending ? "Booking…" : "Book This Slot"}
    </button>
  );
}

export default function FacilityBookingCard({
  facility,
  bookings,
}: {
  facility: {
    facility_id: string;
    facility_name: string;
    facility_type: string;
    property: { property_name: string };
    max_capacity: number;
    is_bookable: boolean;
    operation_days: string;
    open_time: string;
    close_time: string;
  };
  bookings: Booking[];
}) {
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

  const allowedDates = useMemo(() => nextOpenDates(openDays), [openDays]);

  const [date, setDate] = useState(
    allowedDates[0] ?? todayISO()
  );

  const isOpenOnSelected = openDays.has(
    jsDayToMonFirst(new Date(date + "T00:00:00").getDay())
  );

  const dayBookings = useMemo(() => {
    const target = date;
    return bookings
      .filter((b) => {
        const bd = new Date(b.booking_date).toISOString().slice(0, 10);
        return bd === target && b.booking_status !== "Cancelled";
      })
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  }, [bookings, date]);

  const segments = dayBookings.map((b) => {
    const s = Math.max(DAY_START, toMinutes(b.start_time));
    const e = Math.min(DAY_END, toMinutes(b.end_time));
    const left = ((s - DAY_START) / TOTAL) * 100;
    const width = ((e - s) / TOTAL) * 100;
    return { left, width, label: `${b.start_time}–${b.end_time}` };
  });

  const cols = Math.max(1, Math.round(TOTAL / 60));

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">
          meeting_room
        </span>
        <div>
          <p className="font-title-md text-title-md text-on-surface">
            {facility.facility_name}
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {facility.facility_type} · {facility.property.property_name} ·
            Capacity {facility.max_capacity}
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Open {facility.open_time}–{facility.close_time}
          </p>
        </div>
      </div>

      {!facility.is_bookable && (
        <div className="mb-4 rounded-lg bg-error-container/10 border border-error-container/30 px-3 py-2">
          <span className="font-label-md text-label-md text-error-container">
            This facility is not open for booking.
          </span>
        </div>
      )}

      {/* Time-range chart for the selected day, scoped to the facility's hours */}
      <div className="mb-4">
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
              className="absolute top-0 h-full bg-error-container/70 border-x border-error-container flex items-center justify-center"
              style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
              title={`Booked ${seg.label}`}
            >
              <span className="font-label-sm text-label-sm text-on-error-container px-1 truncate">
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
            <span className="w-3 h-3 rounded-sm bg-surface-container-high inline-block border border-outline-variant" />
            Free
          </span>
        </div>
      </div>

      <form action={bookFacility} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="facility_id" value={facility.facility_id} />
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Date
          </span>
          <input
            type="date"
            name="booking_date"
            value={date}
            min={allowedDates[0]}
            list="open-dates"
            required
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
          />
          <datalist id="open-dates">
            {allowedDates.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          {!isOpenOnSelected && (
            <span className="font-label-sm text-label-sm text-error-container">
              Facility is closed on this day.
            </span>
          )}
        </label>
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            From
          </span>
          <input
            type="time"
            name="start_time"
            step={STEP}
            min={facility.open_time}
            max={facility.close_time}
            required
            aria-label="Start time"
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            To
          </span>
          <input
            type="time"
            name="end_time"
            step={STEP}
            min={facility.open_time}
            max={facility.close_time}
            required
            aria-label="End time"
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary w-full"
          />
        </div>
        <input
          type="text"
          name="purpose"
          placeholder="Purpose (optional)"
          className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary sm:col-span-2"
        />
        <SubmitButton />
      </form>
    </div>
  );
}
