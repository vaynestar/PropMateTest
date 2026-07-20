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
      className="btn-primary w-full py-3 font-label-md text-label-md rounded-lg transition-all active:scale-95 disabled:opacity-60"
    >
      {pending ? "Booking…" : "Book Facilities"}
    </button>
  );
}

export default function FacilityBooking({
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
                    {f.facility_type}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {facility && (
        <BookingCard key={facility.facility_id} facility={facility} bookings={bookings} />
      )}
    </div>
  );
}

function BookingCard({ facility, bookings }: { facility: Facility; bookings: Booking[] }) {
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

  const slots = useMemo(() => {
    const out: number[] = [];
    for (let m = DAY_START; m <= DAY_END; m += 5) out.push(m);
    return out;
  }, [DAY_START, DAY_END]);

  const openDates = useMemo(() => nextOpenDates(openDays, 10), [openDays]);
  const [date, setDate] = useState<string>(dateToISO(openDates[0]));
  const [start, setStart] = useState<number>(DAY_START);
  const [end, setEnd] = useState<number>(Math.min(DAY_START + 60, DAY_END));

  const dayBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.facility_id === facility.facility_id &&
          b.booking_date === date &&
          b.booking_status !== "Cancelled"
      ),
    [bookings, facility.facility_id, date]
  );

  const clash = useMemo(() => {
    if (end <= start) return null;
    return (
      dayBookings.find((b) => {
        const bs = toMinutes(b.start_time);
        const be = toMinutes(b.end_time);
        return start < be && end > bs;
      }) ?? null
    );
  }, [dayBookings, start, end]);

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">meeting_room</span>
        <div>
          <p className="font-title-md text-title-md text-on-surface">
            {facility.facility_name}
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {facility.property.property_name} · {facility.open_time}–
            {facility.close_time}
          </p>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-label-sm text-label-sm text-on-surface-variant">Date</span>
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
        >
          {openDates.map((d) => {
            const iso = dateToISO(d);
            const isToday = iso === dateToISO(new Date());
            return (
              <option key={iso} value={iso}>
                {isToday ? "Today" : d.toLocaleDateString("en-MY", { weekday: "short" })}{" "}
                {d.getDate()}
              </option>
            );
          })}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Start time
          </span>
          <select
            value={start}
            onChange={(e) => {
              const v = Number(e.target.value);
              setStart(v);
              if (end <= v) setEnd(Math.min(v + 60, DAY_END));
            }}
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
          >
            {slots
              .filter((m) => m < DAY_END)
              .map((m) => (
                <option key={m} value={m}>
                  {fmt(m)}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            End time
          </span>
          <select
            value={end}
            onChange={(e) => setEnd(Number(e.target.value))}
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
          >
            {slots
              .filter((m) => m > start)
              .map((m) => (
                <option key={m} value={m}>
                  {fmt(m)}
                </option>
              ))}
          </select>
        </label>
      </div>

      {clash && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-error-container">
            This time slot has been booked by others, Please try again
          </span>
        </div>
      )}

      <form action={bookFacility}>
        <input type="hidden" name="facility_id" value={facility.facility_id} />
        <input type="hidden" name="booking_date" value={date} />
        <input type="hidden" name="start_time" value={fmt(start)} />
        <input type="hidden" name="end_time" value={fmt(end)} />
        <SubmitButton />
      </form>
    </div>
  );
}
