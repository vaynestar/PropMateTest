"use client";

import { useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { bookFacility } from "./actions";

type Facility = {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  property: { property_name: string };
  max_capacity: number | null;
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

// All 5-min start-time slots from open to (close - 1h) so a duration always fits
function startSlots(dayStart: number, dayEnd: number): number[] {
  const out: number[] = [];
  for (let m = dayStart; m <= dayEnd - 60; m += 5) out.push(m);
  return out;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary px-6 py-3 font-label-md text-label-md rounded-lg transition-all active:scale-95 disabled:opacity-60 w-full sm:w-auto"
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
        <BookingSheet
          facility={facility}
          bookings={bookings}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function BookingSheet({
  facility,
  bookings,
  onClose,
}: {
  facility: Facility;
  bookings: Booking[];
  onClose: () => void;
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

  const [state, formAction, pending] = useActionState(bookFacility, null);

  const DAY_START = toMinutes(facility.open_time);
  const DAY_END = toMinutes(facility.close_time);
  const slots = useMemo(() => startSlots(DAY_START, DAY_END), [DAY_START, DAY_END]);

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
        .sort((a, b) => {
          const aStart = new Date(a.start_time).getHours() * 60 + new Date(a.start_time).getMinutes();
          const bStart = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
          return aStart - bStart;
        }),
    [bookings, facility.facility_id, date]
  );

  const [startMin, setStartMin] = useState<number>(slots[0]);
  const [duration, setDuration] = useState<number | null>(null);
  const [hourView, setHourView] = useState<number | null>(null);

  const endMin =
    duration !== null ? Math.round(startMin + duration * 60) : startMin;

  const isBooked = (from: number, to: number) =>
    dayBookings.some((b) => {
      const bs = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
      const be = new Date(b.end_time).getHours() * 60 + new Date(b.end_time).getMinutes();
      return from < be && to > bs;
    });

  const clash = useMemo(() => {
    if (duration === null) return null;
    return dayBookings.find((b) => {
      const bs = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
      const be = new Date(b.end_time).getHours() * 60 + new Date(b.end_time).getMinutes();
      return startMin < be && endMin > bs;
    }) ?? null;
  }, [dayBookings, startMin, endMin, duration]);

  const invalidRange = duration !== null && endMin > DAY_END;

  // Hour-separated cells for the availability strip
  const hourCells = useMemo(() => {
    const cells: { hour: number; booked: boolean }[] = [];
    for (let h = DAY_START; h < DAY_END; h += 60) {
      cells.push({ hour: h, booked: isBooked(h, h + 60) });
    }
    return cells;
  }, [DAY_START, DAY_END, dayBookings]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative glass-card rounded-t-2xl max-h-[92vh] overflow-y-auto animate-slide-up p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-title-md text-title-md text-on-surface">
              {facility.facility_name}
            </h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {facility.property.property_name} · Capacity {facility.max_capacity}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-on-surface-variant text-[24px]"
            aria-label="Close"
          >
            close
          </button>
        </div>

        {/* Date strip */}
        <div>
          <p className="font-label-md text-label-md text-on-surface mb-2">
            Pick a date
          </p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {openDates.map((d) => {
              const iso = dateToISO(d);
              const active = iso === date;
              const isToday = iso === dateToISO(new Date());
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setDate(iso);
                    setDuration(null);
                  }}
                  className={`shrink-0 min-w-[72px] flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-all active:scale-95 ${
                    active
                      ? "border-primary bg-primary/10 text-on-surface"
                      : "border-outline-variant bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <span className="font-label-sm text-label-sm">
                    {isToday ? "Today" : d.toLocaleDateString("en-MY", { weekday: "short" })}
                  </span>
                  <span className="font-title-md text-title-md">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hour-separated availability strip (clickable) */}
        <div>
          <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
            <span>{fmt(DAY_START)}</span>
            <span>Availability · tap an hour for full view</span>
            <span>{fmt(DAY_END)}</span>
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${hourCells.length}, minmax(0, 1fr))` }}>
            {hourCells.map((c) => (
              <button
                key={c.hour}
                type="button"
                onClick={() => setHourView(c.hour)}
                className={`py-2 rounded-lg border text-center transition-all active:scale-95 ${
                  c.booked
                    ? "bg-error-container/70 border-error-container text-on-error-container"
                    : "bg-surface-container-high border-outline-variant text-on-surface-variant hover:border-primary/60"
                }`}
              >
                <span className="font-label-sm text-label-sm block">
                  {fmt12(c.hour)}
                </span>
                <span className="font-label-sm text-label-sm">
                  {c.booked ? "Booked" : "Free"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Start time dropdown (all 5-min slots) */}
        <div>
          <p className="font-label-md text-label-md text-on-surface mb-2">
            Start time
          </p>
          <select
            value={startMin}
            onChange={(e) => {
              setStartMin(Number(e.target.value));
              setDuration(null);
            }}
            className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-on-surface outline-none focus:border-primary"
          >
            {slots.map((s) => (
              <option key={s} value={s}>
                {fmt12(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Duration chips auto-appear after start is chosen (Teams-style) */}
        <div>
          <p className="font-label-md text-label-md text-on-surface mb-2">
            Duration
          </p>
          <div className="flex gap-2 flex-wrap">
            {DURATIONS.map((d) => {
              const wouldClash = isBooked(startMin, startMin + d * 60);
              const beyond = startMin + d * 60 > DAY_END;
              const disabled = wouldClash || beyond;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDuration(d)}
                  className={`px-5 py-3 rounded-full border font-label-md text-label-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                    duration === d
                      ? "border-primary bg-primary/10 text-on-surface"
                      : "border-outline-variant bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {d} hr
                </button>
              );
            })}
          </div>
          {duration !== null && (
            <p className="font-label-md text-label-md text-on-surface-variant mt-2">
              {fmt12(startMin)} – {fmt12(endMin)}
            </p>
          )}
        </div>

        {clash && (
          <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
            <span className="font-label-md text-label-md text-error-container">
              This slot clashes with an existing booking. Please choose another time.
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

        {state?.error && (
          <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
            <span className="font-label-md text-label-md text-error-container">
              {state.error}
            </span>
          </div>
        )}

        {state?.success && (
          <div className="rounded-lg bg-primary/20 border border-primary px-4 py-3">
            <span className="font-label-md text-label-md text-primary-fixed">
              {state.message}
            </span>
          </div>
        )}

        {duration !== null && !clash && !invalidRange && (
          <form action={formAction} className="flex justify-end">
            <input type="hidden" name="facility_id" value={facility.facility_id} />
            <input type="hidden" name="booking_date" value={date} />
            <input type="hidden" name="start_time" value={fmt(startMin)} />
            <input type="hidden" name="end_time" value={fmt(endMin)} />
            <SubmitButton />
          </form>
        )}
      </div>

      {/* Full hour view modal */}
      {hourView !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setHourView(null)} aria-hidden />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-title-md text-title-md text-on-surface">
                {fmt12(hourView)} – {fmt12(hourView + 60)} · {date}
              </h4>
              <button
                type="button"
                onClick={() => setHourView(null)}
                className="material-symbols-outlined text-on-surface-variant"
                aria-label="Close"
              >
                close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const from = hourView + i * 5;
                const to = from + 5;
                const booked = isBooked(from, to);
                return (
                  <div
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-center ${
                      booked
                        ? "bg-error-container/30 border-error-container/50 text-error-container"
                        : "bg-surface-container-high border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    <span className="font-label-sm text-label-sm">
                      {fmt(from)}–{fmt(to)}
                    </span>
                    <span className="block font-label-sm text-label-sm">
                      {booked ? "Booked" : "Free"}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setStartMin(hourView);
                setDuration(null);
                setHourView(null);
              }}
              className="btn-primary w-full py-3 font-label-md text-label-md rounded-lg transition-all active:scale-95"
            >
              Use {fmt12(hourView)} as start time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
