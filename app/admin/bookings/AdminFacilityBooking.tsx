"use client";

import { useMemo, useState, useTransition } from "react";
import { adminBookFacility } from "./actions";
import BookingTimeline from "@/components/facilities/BookingTimeline";

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
  booking_date: string | Date;
  start_time: string | Date;
  end_time: string | Date;
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

export default function AdminFacilityBooking({
  facilities,
  bookings,
  leases,
}: {
  facilities: Facility[];
  bookings: Booking[];
  leases: any[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const facility = facilities.find((f) => f.facility_id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {facilities.map((f) => {
          const active = f.facility_id === selectedId;
          return (
            <button
              key={f.facility_id}
              type="button"
              onClick={() => setSelectedId(f.facility_id)}
              className={`bg-surface-container rounded-xl p-4 text-left transition-all active:scale-[0.98] ${
                active
                  ? "border border-primary bg-primary/5"
                  : "border border-[#4a4455] hover:border-primary/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  sports_tennis
                </span>
                <div>
                  <p className="text-white font-medium">
                    {f.facility_name}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {f.facility_type}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {facility && (
        <BookingCard key={facility.facility_id} facility={facility} bookings={bookings} leases={leases} />
      )}
    </div>
  );
}

function BookingCard({ facility, bookings, leases }: { facility: Facility; bookings: Booking[]; leases: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [leaseId, setLeaseId] = useState("");

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

  const openDates = useMemo(() => nextOpenDates(openDays, 14), [openDays]);
  const [date, setDate] = useState<string>(dateToISO(openDates[0]));

  const initialStartHour = Math.floor(DAY_START / 60);
  const initialEndHour = Math.floor(Math.min(DAY_START + 60, DAY_END) / 60);
  
  const [startHour, setStartHour] = useState<number>(initialStartHour);
  const [startMin, setStartMin] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(initialEndHour);
  const [endMin, setEndMin] = useState<number>(0);

  const start = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  const dayBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Handle the fact that prisma returns Dates
      const bDate = new Date(b.booking_date);
      const isoDate = dateToISO(bDate);
      return (
        b.facility_id === facility.facility_id &&
        isoDate === date &&
        b.booking_status !== "Cancelled" &&
        b.booking_status !== "Rejected"
      );
    });
  }, [bookings, facility.facility_id, date]);

  const clash = useMemo(() => {
    if (end <= start) return null;
    return (
      dayBookings.find((b) => {
        const dStart = new Date(b.start_time);
        const dEnd = new Date(b.end_time);
        const bs = dStart.getHours() * 60 + dStart.getMinutes();
        const be = dEnd.getHours() * 60 + dEnd.getMinutes();
        return start < be && end > bs;
      }) ?? null
    );
  }, [dayBookings, start, end]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!leaseId) {
      setError("Please select a tenant/unit to book for.");
      return;
    }
    if (clash) {
      setError("This time slot has been booked. Please try another time.");
      return;
    }

    if (start < DAY_START || end > DAY_END) {
      setError(`Booking must be within operating hours (${facility.open_time} - ${facility.close_time}).`);
      return;
    }

    const formData = new FormData();
    formData.append("facility_id", facility.facility_id);
    formData.append("lease_id", leaseId);
    formData.append("booking_date", date);
    formData.append("start_time", fmt(start));
    formData.append("end_time", fmt(end));

    startTransition(async () => {
      const res = await adminBookFacility(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  return (
    <div className="bg-surface-container border border-[#4a4455] rounded-xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center gap-3 border-b border-[#4a4455] pb-4">
        <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
        <div>
          <p className="font-semibold text-white">
            Booking for {facility.facility_name}
          </p>
          <p className="text-xs text-on-surface-variant">
            {facility.property.property_name} · Open: {facility.open_time}–{facility.close_time}
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          Booking successfully created!
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tenant / Unit</span>
          <select
            value={leaseId}
            onChange={(e) => setLeaseId(e.target.value)}
            className="rounded-lg bg-[#0c1324] border border-[#4a4455] px-3 py-2.5 text-white outline-none focus:border-primary"
          >
            <option value="">Select Tenant to book for...</option>
            {leases.map((l) => (
              <option key={l.lease_id} value={l.lease_id}>
                Unit {l.unit.unit_number} - {l.tenant.user_name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Date</span>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-[#0c1324] border border-[#4a4455] px-3 py-2.5 text-white outline-none focus:border-primary"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 border border-[#4a4455] rounded-lg p-4 bg-[#0c1324]">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Start time
            </span>
            <div className="flex gap-2">
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="flex-1 rounded-lg bg-surface-container border border-[#4a4455] px-3 py-2.5 text-white outline-none focus:border-primary"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{pad(i)}</option>
                ))}
              </select>
              <span className="text-white self-center font-bold">:</span>
              <select
                value={startMin}
                onChange={(e) => setStartMin(Number(e.target.value))}
                className="flex-1 rounded-lg bg-surface-container border border-[#4a4455] px-3 py-2.5 text-white outline-none focus:border-primary"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i * 5} value={i * 5}>{pad(i * 5)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 border border-[#4a4455] rounded-lg p-4 bg-[#0c1324]">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              End time
            </span>
            <div className="flex gap-2">
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="flex-1 rounded-lg bg-surface-container border border-[#4a4455] px-3 py-2.5 text-white outline-none focus:border-primary"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>{pad(i)}</option>
                ))}
              </select>
              <span className="text-white self-center font-bold">:</span>
              <select
                value={endMin}
                onChange={(e) => setEndMin(Number(e.target.value))}
                className="flex-1 rounded-lg bg-surface-container border border-[#4a4455] px-3 py-2.5 text-white outline-none focus:border-primary"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i * 5} value={i * 5}>{pad(i * 5)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="pt-2">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Availability Timeline</p>
          <BookingTimeline 
            dayStart={DAY_START} 
            dayEnd={DAY_END} 
            bookings={dayBookings.map(b => ({
              start_time: toMinutes(new Date(b.start_time).toTimeString().slice(0,5)),
              end_time: toMinutes(new Date(b.end_time).toTimeString().slice(0,5)),
            }))} 
            selectedStart={start}
            selectedEnd={end}
          />
        </div>

        {clash && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3">
            <span className="text-sm text-rose-400">
              This time slot is already booked. Please try another time.
            </span>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !!clash || !leaseId}
            className="gradient-btn px-6 py-2.5 rounded-lg font-medium text-white shadow-lg flex items-center gap-2 disabled:opacity-50 pressable w-full sm:w-auto justify-center"
          >
            {isPending ? (
              <span className="material-symbols-outlined animate-spin-slow">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">add_task</span>
            )}
            {isPending ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}
