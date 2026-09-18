"use client";

import { useMemo, useState, Fragment, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { bookFacility } from "./actions";
import BookingTimeline from "@/components/facilities/BookingTimeline";
import BookingCalendarDatePicker from "@/components/facilities/BookingCalendarDatePicker";
import BookingResultModal from "@/components/facilities/BookingResultModal";
import { getFacilityAccentColor } from "@/lib/facility-colors";
import { shortDate } from "@/lib/short-date";

type Facility = {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  property: { property_name: string };
  max_capacity: number | null;
  operation_days: string;
  open_time: string;
  close_time: string;
  max_booking_hours: number | null;
  image_url?: string | null;
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "1,2,3,4,5,6,7" -> "Every day"; "1,2,3,4,5" -> "Mon – Fri"; else "Mon, Wed, Fri". */
function openDaysLabel(days: string): string {
  const set = Array.from(
    new Set(days.split(",").map((d) => Number(d.trim())).filter((n) => n >= 1 && n <= 7))
  ).sort((a, b) => a - b);
  if (set.length === 7) return "Every day";
  if (set.length === 0) return "Closed";
  const contiguous = set.every((d, i) => i === 0 || d === set[i - 1] + 1);
  if (contiguous && set.length > 2) return `${DAY_NAMES[set[0] - 1]} – ${DAY_NAMES[set[set.length - 1] - 1]}`;
  return set.map((d) => DAY_NAMES[d - 1]).join(", ");
}

function clock12(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full py-3 font-bold text-sm text-white rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 pressable"
    >
      <span className="material-symbols-outlined text-[20px]">
        {pending ? "progress_activity" : "check_circle"}
      </span>
      {pending ? "Confirming Booking…" : "Confirm Booking"}
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

  return (
    <div className="space-y-6 min-w-0 w-full max-w-full">
      {/* 2 Columns per row grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {facilities.map((f) => {
          const active = f.facility_id === selectedId;
          const colorTheme = getFacilityAccentColor(f.facility_type);

          return (
            <Fragment key={f.facility_id}>
              {/* Photo card (DEV-184, user: "seem abit plain ... add picture for facilities") */}
              <button
                type="button"
                onClick={() => setSelectedId(active ? null : f.facility_id)}
                aria-expanded={active}
                className={`rounded-2xl overflow-hidden glass-card flex flex-col group text-left transition-all pressable ${
                  active
                    ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                    : "border border-outline-variant/50 hover:border-primary/50"
                }`}
              >
                <div className="relative w-full aspect-[16/9] overflow-hidden">
                  {f.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.image_url}
                      alt={f.facility_name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`absolute inset-0 ${colorTheme.bg} flex items-center justify-center`}>
                      <span className={`material-symbols-outlined text-[64px] ${colorTheme.text} opacity-60`}>
                        {colorTheme.icon}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm border border-white/15 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">{colorTheme.icon}</span>
                    {f.facility_type}
                  </span>
                  <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm border border-white/15 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    {f.max_capacity ? `Up to ${f.max_capacity}` : "Open"}
                  </span>

                  <div className="absolute bottom-0 inset-x-0 p-4">
                    <h3 className="text-lg font-bold text-white leading-tight truncate drop-shadow">{f.facility_name}</h3>
                    <p className="text-xs text-white/80 truncate">{f.property.property_name}</p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">Open</p>
                    <p className="text-sm font-bold text-on-surface tabular-nums flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                      {f.open_time} – {f.close_time}
                    </p>
                    <p className="text-[11px] text-on-surface-variant truncate">{openDaysLabel(f.operation_days)}</p>
                  </div>
                  <span
                    className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors ${
                      active ? "bg-surface-container-highest text-on-surface" : "bg-primary text-black shadow-md shadow-primary/20"
                    }`}
                  >
                    {active ? "Close" : "Book"}
                    <span className="material-symbols-outlined text-[18px]">{active ? "expand_less" : "arrow_forward"}</span>
                  </span>
                </div>
              </button>

              {/* Expanded Booking Calendar Details (Spans 2 columns) */}
              {active && (
                <div className="col-span-1 sm:col-span-2 w-full animate-in fade-in slide-in-from-top-4 duration-300">
                  <BookingCard facility={f} bookings={bookings} />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
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

  const openDates = useMemo(() => nextOpenDates(openDays, 10), [openDays]);
  const [date, setDate] = useState<string>(dateToISO(openDates[0]));

  const initialStartHour = Math.floor(DAY_START / 60);
  const initialEndHour = Math.floor(Math.min(DAY_START + 60, DAY_END) / 60);

  const [state, formAction, pending] = useActionState(bookFacility, null);
  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title?: string;
    message: string;
    facilityName?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  useEffect(() => {
    if (state?.success) {
      setModalConfig({
        isOpen: true,
        type: "success",
        title: "Slot reserved",
        message: state.message || "Your slot is reserved. It is under My Bookings.",
        facilityName: facility.facility_name,
        date,
        startTime: fmt(start),
        endTime: fmt(end),
      });
    } else if (state?.error) {
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Unable to Reserve Facility",
        message: state.error,
        facilityName: facility.facility_name,
      });
    }
  }, [state]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (clash === "out_of_bounds") {
      e.preventDefault();
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Operating Hours Constraint",
        message: `Booking must be within operating hours (${facility.open_time} - ${facility.close_time}).`,
        facilityName: facility.facility_name,
      });
      return;
    }
    if (clash === "max_exceeded") {
      e.preventDefault();
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Duration Limit Exceeded",
        message: `Maximum booking duration allowed for this facility is ${facility.max_booking_hours} hours.`,
        facilityName: facility.facility_name,
      });
      return;
    }
    if (clash) {
      e.preventDefault();
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Time Slot Unavailable",
        message: "This time slot has already been booked by another resident. Please select a different time slot.",
        facilityName: facility.facility_name,
      });
      return;
    }
  };
  
  const [startDisplayHour, setStartDisplayHour] = useState<number>(initialStartHour % 12 || 12);
  const [startMin, setStartMin] = useState<number>(0);
  const [startPeriod, setStartPeriod] = useState<"AM"|"PM">(initialStartHour >= 12 ? "PM" : "AM");

  const [endDisplayHour, setEndDisplayHour] = useState<number>(initialEndHour % 12 || 12);
  const [endMin, setEndMin] = useState<number>(0);
  const [endPeriod, setEndPeriod] = useState<"AM"|"PM">(initialEndHour >= 12 ? "PM" : "AM");

  const startHour = (startDisplayHour === 12 ? 0 : startDisplayHour) + (startPeriod === "PM" ? 12 : 0);
  const endHour = (endDisplayHour === 12 ? 0 : endDisplayHour) + (endPeriod === "PM" ? 12 : 0);

  const handleDuration = (hours: number) => {
    const newEndMinTotal = startHour * 60 + startMin + hours * 60;
    const endH = Math.floor(newEndMinTotal / 60) % 24;
    const endM = newEndMinTotal % 60;
    setEndDisplayHour(endH % 12 || 12);
    setEndMin(endM);
    setEndPeriod(endH >= 12 ? "PM" : "AM");
  };

  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

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
    if (facility.max_booking_hours && (end - start) > facility.max_booking_hours * 60) return "max_exceeded";
    if (start < DAY_START || end > DAY_END) return "out_of_bounds";
    return (
      dayBookings.find((b) => {
        const bs = new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes();
        const be = new Date(b.end_time).getHours() * 60 + new Date(b.end_time).getMinutes();
        return start < be && end > bs;
      }) ?? null
    );
  }, [dayBookings, start, end, DAY_START, DAY_END, facility.max_booking_hours]);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-5 border border-primary/30">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined">event_available</span>
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-on-surface truncate">Book {facility.facility_name}</p>
          <p className="text-xs text-on-surface/80">
            Open {facility.open_time} – {facility.close_time} · {openDaysLabel(facility.operation_days)}
            {facility.max_booking_hours ? ` · up to ${facility.max_booking_hours} h` : ""}
          </p>
        </div>
      </div>

      <BookingCalendarDatePicker
        selectedDate={date}
        onSelectDate={(newDate) => setDate(newDate)}
        operationDays={facility.operation_days}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 min-w-0">
        <div className="flex flex-col gap-2 border border-outline-variant/30 rounded-lg p-3 md:p-4 bg-surface-container/50 min-w-0">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-primary">login</span>
            Start time
          </span>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <select
              value={startDisplayHour}
              onChange={(e) => setStartDisplayHour(Number(e.target.value))}
              className="flex-1 min-w-0 rounded-lg bg-surface-container-highest border border-outline-variant px-2 py-2.5 text-on-surface font-semibold tabular-nums outline-none focus:border-primary text-base sm:text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{pad(i + 1)}</option>
              ))}
            </select>
            <span className="text-on-surface self-center font-bold">:</span>
            <select
              value={startMin}
              onChange={(e) => setStartMin(Number(e.target.value))}
              className="flex-1 min-w-0 rounded-lg bg-surface-container-highest border border-outline-variant px-2 py-2.5 text-on-surface font-semibold tabular-nums outline-none focus:border-primary text-base sm:text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i * 5} value={i * 5}>{pad(i * 5)}</option>
              ))}
            </select>
            <select
              value={startPeriod}
              onChange={(e) => setStartPeriod(e.target.value as "AM"|"PM")}
              className="flex-1 min-w-0 rounded-lg bg-surface-container-highest border border-outline-variant px-2 py-2.5 text-on-surface font-semibold tabular-nums outline-none focus:border-primary text-base sm:text-sm"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[1, 1.5, 2, 2.5, 3].map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => handleDuration(dur)}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors ${
                  end - start === dur * 60
                    ? "bg-primary text-black border-primary"
                    : "border-outline-variant text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {dur}h
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 border border-outline-variant/30 rounded-lg p-3 md:p-4 bg-surface-container/50 min-w-0">
          <span className="text-xs font-bold text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-primary">logout</span>
            End time
          </span>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <select
              value={endDisplayHour}
              onChange={(e) => setEndDisplayHour(Number(e.target.value))}
              className="flex-1 min-w-0 rounded-lg bg-surface-container-highest border border-outline-variant px-2 py-2.5 text-on-surface font-semibold tabular-nums outline-none focus:border-primary text-base sm:text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{pad(i + 1)}</option>
              ))}
            </select>
            <span className="text-on-surface self-center font-bold">:</span>
            <select
              value={endMin}
              onChange={(e) => setEndMin(Number(e.target.value))}
              className="flex-1 min-w-0 rounded-lg bg-surface-container-highest border border-outline-variant px-2 py-2.5 text-on-surface font-semibold tabular-nums outline-none focus:border-primary text-base sm:text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i * 5} value={i * 5}>{pad(i * 5)}</option>
              ))}
            </select>
            <select
              value={endPeriod}
              onChange={(e) => setEndPeriod(e.target.value as "AM"|"PM")}
              className="flex-1 min-w-0 rounded-lg bg-surface-container-highest border border-outline-variant px-2 py-2.5 text-on-surface font-semibold tabular-nums outline-none focus:border-primary text-base sm:text-sm"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

      {/* The chosen slot in plain words - the timeline alone was hard to read (DEV-184) */}
      <div
        className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${
          clash || end <= start ? "bg-rose-500/10 border-rose-500/40" : "bg-primary/10 border-primary/40"
        }`}
      >
        <span className={`material-symbols-outlined ${clash || end <= start ? "text-rose-300" : "text-primary"}`}>
          {clash || end <= start ? "error" : "check_circle"}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface/80">Your booking</p>
          <p className="text-base font-bold text-on-surface tabular-nums">
            {shortDate(date)}
            {" · "}
            {clock12(start)} – {clock12(end)}
            {end > start ? ` (${(end - start) / 60} h)` : ""}
          </p>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="pt-1 min-w-0 w-full max-w-full">
        <p className="text-xs font-bold text-on-surface mb-1">Who has booked this day</p>
        <BookingTimeline 
          dayStart={DAY_START} 
          dayEnd={DAY_END} 
          bookings={dayBookings.map(b => ({
            start_time: new Date(b.start_time).getHours() * 60 + new Date(b.start_time).getMinutes(),
            end_time: new Date(b.end_time).getHours() * 60 + new Date(b.end_time).getMinutes(),
          }))} 
          selectedStart={start}
          selectedEnd={end}
          hasClash={!!clash}
        />
      </div>

      {clash === "out_of_bounds" && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-error-container">
            Booking must be within operating hours ({facility.open_time} - {facility.close_time}).
          </span>
        </div>
      )}

      {clash === "max_exceeded" && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-error-container">
            Maximum booking duration allowed is {facility.max_booking_hours} hours.
          </span>
        </div>
      )}
      
      {clash && clash !== "out_of_bounds" && clash !== "max_exceeded" && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-error-container">
            This time slot has been booked by others. Please try again.
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

      <form action={formAction} onSubmit={handleFormSubmit}>
        <input type="hidden" name="facility_id" value={facility.facility_id} />
        <input type="hidden" name="booking_date" value={date} />
        <input type="hidden" name="start_time" value={fmt(start)} />
        <input type="hidden" name="end_time" value={fmt(end)} />
        <div className="opacity-0 h-0 w-0 overflow-hidden">
           {/* Prevent form submission if clash */}
           <input type="text" name="_guard" required={!!clash} />
        </div>
        <SubmitButton />
      </form>

      {modalConfig && (
        <BookingResultModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig(null)}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          facilityName={modalConfig.facilityName}
          date={modalConfig.date}
          startTime={modalConfig.startTime}
          endTime={modalConfig.endTime}
        />
      )}
    </div>
  );
}
