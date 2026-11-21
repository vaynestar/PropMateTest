"use client";

import { useMemo, useState, Fragment, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { bookFacility } from "./actions";
import BookingTimeline from "@/components/facilities/BookingTimeline";
import BookingCalendarDatePicker from "@/components/facilities/BookingCalendarDatePicker";
import BookingResultModal from "@/components/facilities/BookingResultModal";
import BookingSummaryPanel, { type ClashKind } from "@/components/facilities/BookingSummaryPanel";
import { useLiveSlots, checkedLabel } from "@/components/facilities/useLiveSlots";
import { getFacilityAccentColor } from "@/lib/facility-colors";

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

/**
 * A booked slot on this facility, already reduced to minutes in Malaysia time
 * by the page. This used to be the resident's own bookings with "18:00" time
 * strings, which `new Date()` turned into NaN - so nothing ever clashed and
 * the timeline drew nothing (R10).
 */
type Slot = {
  facility_id: string;
  booking_date: string;
  start_min: number;
  end_min: number;
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
  slots,
}: {
  facilities: Facility[];
  slots: Slot[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = facilities.find((f) => f.facility_id === selectedId) ?? null;

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedId(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selectedId]);

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
                    {/* A two-column grid at tablet width cut the longer facility names (R13). */}
                    <h3 className="text-lg font-bold text-white leading-tight break-words drop-shadow line-clamp-2">{f.facility_name}</h3>
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

            </Fragment>
          );
        })}
      </div>

      {/*
        The booking form as a dialog, not an inline panel.
        Expanding in place pushed every other facility down the page and, at
        phone width, left the calendar below the fold with the only way out a
        second tap on a card that had scrolled away.
      */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Book ${selected.facility_name}`}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
        >
          <button
            type="button"
            aria-label="Close booking"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          {/*
            Header OUTSIDE the scroll area, not `sticky` inside it.

            It was sticky within the scrolling panel, on a 95%-opaque
            background with a backdrop blur, so the form slid underneath and
            showed through it - the duration chips read as though they were
            printed on the title bar (user, 2026-11-22, on iOS: "facilities
            when scrolling the top bar seem overlay?"). Measured before the
            fix: six elements painting inside the header's band.

            A flex column with a shrink-0 header and its own scrolling body
            makes the overlap impossible rather than merely hard to see, and
            matches the dialog ExpandableForm uses. The background is now
            fully opaque for the same reason.
          */}
          <div className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-outline-variant/60 bg-surface-container-lowest animate-in fade-in slide-in-from-bottom-4 duration-200 sm:max-w-lg sm:rounded-3xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-lowest px-4 py-3 sm:px-5">
              <p className="min-w-0 truncate text-sm font-bold text-on-surface">Book {selected.facility_name}</p>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5">
              <BookingCard facility={selected} slots={slots} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({ facility, slots }: { facility: Facility; slots: Slot[] }) {
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

  /*
   * The server's verdict. A refusal used to end here, with a modal over a
   * form that still showed the slot as free. Now a lost race re-reads the day
   * first, so when the modal is dismissed the hour is already crossed out and
   * the next tap is a different time rather than the same one again.
   */
  useEffect(() => {
    if (state?.success) {
      refresh();
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
      if (state.conflict) refresh();
      setModalConfig({
        isOpen: true,
        type: "error",
        title: state.conflict ? "That slot has just gone" : "Unable to Reserve Facility",
        message: state.conflict
          ? `${state.error} The times below have been refreshed — pick another slot and confirm again.`
          : state.error,
        facilityName: facility.facility_name,
      });
    }
  }, [state]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (clash === "invalid") {
      e.preventDefault();
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Check the times",
        message: "The end time has to be after the start time.",
        facilityName: facility.facility_name,
      });
      return;
    }
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
      refresh();
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "That time is taken",
        message: takenLabel
          ? `Someone already has ${facility.facility_name} from ${takenLabel}. Please choose another time slot.`
          : "This time slot is not available. Please choose another time slot.",
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

  /*
   * The day as the SERVER last rendered it. Used until the first live read
   * lands, so the grid is never briefly blank.
   */
  const seedBookings = useMemo(
    () =>
      slots
        .filter((s) => s.facility_id === facility.facility_id && s.booking_date === date)
        .map((s) => ({ start_min: s.start_min, end_min: s.end_min })),
    [slots, facility.facility_id, date]
  );

  /*
   * ...and the day as it actually is (DEV-251). Re-read when the sheet opens,
   * when the date changes, when the tab comes back to the front, every 20
   * seconds while it is open, and the instant the server refuses a slot.
   *
   * The complaint behind this: two phones booked the same hour, the second
   * was correctly refused - and then went on showing the hour as free, so the
   * only thing left to do was press Confirm again.
   */
  const { slots: dayBookings, refresh, refreshing, checkedAt } = useLiveSlots(
    facility.facility_id,
    date,
    seedBookings
  );

  /*
   * One-hour slots across the opening hours, with the taken ones shown as
   * taken BEFORE the resident chooses.
   *
   * The dropdowns below still exist, because a three-hour function room
   * booking cannot be made from a grid of single hours. But the common case
   * is "give me an hour", and until now the only way to discover that 10am
   * was gone was to pick it and be refused - which reads as the system being
   * broken rather than the slot being busy (the DEV-232 complaint, one layer
   * further back).
   *
   * An hour in the past on today's date is spent, so it is offered as taken
   * too: residents booking on the day of their UAT slot would otherwise pick
   * a morning hour at lunchtime and be refused by the server.
   */
  const quickSlots = useMemo(() => {
    /*
     * The building's clock, not the viewer's. getHours() reads the device's
     * timezone, so a resident travelling would have seen the wrong hours
     * greyed out - the same mistake the booking code already had to fix once
     * (R23/D-25, lib/booking-time.ts).
     */
    const kl = new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const [dmy, hm] = kl.split(", ");
    const [dd, mm, yyyy] = dmy.split("/");
    const todayIso = `${yyyy}-${mm}-${dd}`;
    const [hh, mi] = hm.split(":").map(Number);
    const nowMin = hh * 60 + mi;
    const out: { from: number; label: string; taken: boolean; past: boolean }[] = [];
    for (let m = DAY_START; m + 60 <= DAY_END; m += 60) {
      out.push({
        from: m,
        label: fmt(m),
        taken: dayBookings.some((b) => m < b.end_min && m + 60 > b.start_min),
        past: date === todayIso && m < nowMin,
      });
    }
    return out;
  }, [DAY_START, DAY_END, dayBookings, date]);

  const pickHour = (from: number) => {
    const sh = Math.floor(from / 60);
    const eh = Math.floor((from + 60) / 60);
    setStartDisplayHour(sh % 12 || 12);
    setStartMin(from % 60);
    setStartPeriod(sh >= 12 ? "PM" : "AM");
    setEndDisplayHour(eh % 12 || 12);
    setEndMin((from + 60) % 60);
    setEndPeriod(eh >= 12 ? "PM" : "AM");
  };

  /*
   * One named verdict on the chosen slot, instead of a value that was
   * sometimes a string, sometimes a booking object and sometimes null - which
   * is why "end before start" showed a red panel with no explanation.
   */
  const { clash, takenBy } = useMemo((): { clash: ClashKind; takenBy: Slot | null } => {
    if (end <= start) return { clash: "invalid", takenBy: null };
    if (facility.max_booking_hours && end - start > facility.max_booking_hours * 60)
      return { clash: "max_exceeded", takenBy: null };
    if (start < DAY_START || end > DAY_END) return { clash: "out_of_bounds", takenBy: null };
    const hit = dayBookings.find((b) => start < b.end_min && end > b.start_min);
    return hit ? { clash: "taken", takenBy: hit as Slot } : { clash: null, takenBy: null };
  }, [dayBookings, start, end, DAY_START, DAY_END, facility.max_booking_hours]);

  const takenLabel = takenBy ? `${clock12(takenBy.start_min)} to ${clock12(takenBy.end_min)}` : null;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-5 border border-primary/30">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined">event_available</span>
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-on-surface break-words leading-tight">Book {facility.facility_name}</p>
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
        slotBlocked={!!clash || end <= start}
      />

      {/* Pick an hour. Taken ones cannot be chosen, so a clash cannot happen. */}
      <div>
        <p className="mb-2 text-xs font-semibold text-on-surface-variant">Pick an hour</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {quickSlots.map((s) => {
            const unavailable = s.taken || s.past;
            const chosen = !unavailable && start === s.from && end === s.from + 60;
            return (
              <button
                key={s.from}
                type="button"
                disabled={unavailable}
                onClick={() => pickHour(s.from)}
                aria-label={
                  s.taken ? `${s.label}, already booked` : s.past ? `${s.label}, already passed` : `Book ${s.label}`
                }
                className={`pressable min-h-[44px] rounded-xl border text-sm transition-colors ${
                  unavailable
                    ? "cursor-not-allowed border-outline-variant/40 bg-surface-container/50 text-on-surface-variant/50 line-through"
                    : chosen
                      ? "border-primary bg-primary/20 font-bold text-on-surface"
                      : "border-outline-variant bg-surface-container text-on-surface hover:border-primary/60"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-on-surface-variant">
          Crossed out means already taken. For a longer booking, set the times below.
        </p>
      </div>

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
                /* py-1.5 made a 26px target on a phone (R20). */
                className={`h-11 min-w-[56px] flex-1 px-2 text-xs font-bold rounded-lg border transition-colors ${
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

      {/*
        The chosen slot, and whether it can be had. The three separate error
        strips that used to sit under the timeline said the same things a
        scroll further down, after the panel had already gone quietly rose;
        the panel says it itself now, in red, with an X and a shake.
        `key` on the clash replays the shake for each NEW refusal.
      */}
      <BookingSummaryPanel
        key={`${clash ?? "ok"}-${start}-${end}-${date}`}
        date={date}
        start={start}
        end={end}
        clash={clash}
        openTime={facility.open_time}
        closeTime={facility.close_time}
        maxHours={facility.max_booking_hours}
        takenLabel={takenLabel}
      />

      {/* Timeline Visualization */}
      <div className="pt-1 min-w-0 w-full max-w-full">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-xs font-bold text-on-surface">Time slot availability</p>
          <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            {refreshing && (
              <span className="material-symbols-outlined animate-spin-slow text-[13px]" aria-hidden="true">
                progress_activity
              </span>
            )}
            {checkedLabel(checkedAt, refreshing)}
          </span>
        </div>
        <BookingTimeline
          dayStart={DAY_START}
          dayEnd={DAY_END}
          bookings={dayBookings.map((b) => ({ start_time: b.start_min, end_time: b.end_min }))}
          selectedStart={start}
          selectedEnd={end}
          hasClash={!!clash}
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-error-container/10 border border-error-container/40 px-4 py-3">
          <span className="font-label-md text-label-md text-on-error-container">
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

        {/*
          The booking carries a pax count, the admin list draws it and the
          server checks it against the facility's capacity - but the resident
          form never sent one, so every booking was a party of one (R23/D-30).
        */}
        <div className="flex flex-col gap-1.5 mb-3">
          <label htmlFor={`pax-${facility.facility_id}`} className="text-xs font-bold text-on-surface">
            How many people?
            {facility.max_capacity ? (
              <span className="font-normal text-on-surface-variant"> · up to {facility.max_capacity}</span>
            ) : null}
          </label>
          <input
            id={`pax-${facility.facility_id}`}
            name="pax_count"
            type="number"
            inputMode="numeric"
            min={1}
            max={facility.max_capacity ?? undefined}
            defaultValue={1}
            className="h-11 w-28 rounded-lg border border-outline-variant bg-surface-container-high px-3 text-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

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
