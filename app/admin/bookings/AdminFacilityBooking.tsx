"use client";

import { useMemo, useState, useTransition } from "react";
import { adminBookFacility } from "./actions";
import BookingTimeline from "@/components/facilities/BookingTimeline";
import BookingCalendarDatePicker from "@/components/facilities/BookingCalendarDatePicker";
import BookingResultModal from "@/components/facilities/BookingResultModal";

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
    <div className="space-y-6 min-w-0 w-full max-w-full">
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
    if (facility.max_booking_hours && (end - start) > facility.max_booking_hours * 60) return "max_exceeded";
    return (
      dayBookings.find((b) => {
        const dStart = new Date(b.start_time);
        const dEnd = new Date(b.end_time);
        const bs = dStart.getHours() * 60 + dStart.getMinutes();
        const be = dEnd.getHours() * 60 + dEnd.getMinutes();
        return start < be && end > bs;
      }) ?? null
    );
  }, [dayBookings, start, end, facility.max_booking_hours]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!leaseId) {
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Tenant / Unit Selection Required",
        message: "Please select a tenant or unit to create a booking for.",
        facilityName: facility.facility_name,
      });
      return;
    }
    if (clash === "max_exceeded") {
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
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Time Slot Unavailable",
        message: "This time slot has already been booked. Please select a different time slot.",
        facilityName: facility.facility_name,
      });
      return;
    }

    if (start < DAY_START || end > DAY_END) {
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Operating Hours Constraint",
        message: `Booking must be within operating hours (${facility.open_time} - ${facility.close_time}).`,
        facilityName: facility.facility_name,
      });
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
        setModalConfig({
          isOpen: true,
          type: "error",
          title: "Booking Failed",
          message: res.error,
          facilityName: facility.facility_name,
        });
      } else {
        setModalConfig({
          isOpen: true,
          type: "success",
          title: "Facility Booking Confirmed!",
          message: "The facility has been successfully booked on behalf of the resident.",
          facilityName: facility.facility_name,
          date,
          startTime: fmt(start),
          endTime: fmt(end),
        });
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

        <BookingCalendarDatePicker
          selectedDate={date}
          onSelectDate={(newDate) => setDate(newDate)}
          operationDays={facility.operation_days}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 min-w-0">
          <div className="flex flex-col gap-2 border border-[#4a4455] rounded-lg p-3 md:p-4 bg-[#0c1324] min-w-0">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Start time
            </span>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <select
                value={startDisplayHour}
                onChange={(e) => setStartDisplayHour(Number(e.target.value))}
                className="flex-1 min-w-0 rounded-lg bg-surface-container border border-[#4a4455] px-2 py-2.5 text-white outline-none focus:border-primary text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{pad(i + 1)}</option>
                ))}
              </select>
              <span className="text-white self-center font-bold">:</span>
              <select
                value={startMin}
                onChange={(e) => setStartMin(Number(e.target.value))}
                className="flex-1 min-w-0 rounded-lg bg-surface-container border border-[#4a4455] px-2 py-2.5 text-white outline-none focus:border-primary text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i * 5} value={i * 5}>{pad(i * 5)}</option>
                ))}
              </select>
              <select
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value as "AM"|"PM")}
                className="flex-1 min-w-0 rounded-lg bg-surface-container border border-[#4a4455] px-2 py-2.5 text-white outline-none focus:border-primary text-sm"
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
                  className="flex-1 py-1 px-2 text-xs font-medium rounded border border-[#4a4455] hover:bg-surface-container transition-colors text-white"
                >
                  +{dur}h
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 border border-[#4a4455] rounded-lg p-3 md:p-4 bg-[#0c1324] min-w-0">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              End time
            </span>
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <select
                value={endDisplayHour}
                onChange={(e) => setEndDisplayHour(Number(e.target.value))}
                className="flex-1 min-w-0 rounded-lg bg-surface-container border border-[#4a4455] px-2 py-2.5 text-white outline-none focus:border-primary text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{pad(i + 1)}</option>
                ))}
              </select>
              <span className="text-white self-center font-bold">:</span>
              <select
                value={endMin}
                onChange={(e) => setEndMin(Number(e.target.value))}
                className="flex-1 min-w-0 rounded-lg bg-surface-container border border-[#4a4455] px-2 py-2.5 text-white outline-none focus:border-primary text-sm"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i * 5} value={i * 5}>{pad(i * 5)}</option>
                ))}
              </select>
              <select
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value as "AM"|"PM")}
                className="flex-1 min-w-0 rounded-lg bg-surface-container border border-[#4a4455] px-2 py-2.5 text-white outline-none focus:border-primary text-sm"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="pt-2 min-w-0 w-full max-w-full">
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
            hasClash={!!clash}
          />
        </div>

        {clash === "max_exceeded" && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3">
            <span className="text-sm text-rose-400">
              Maximum booking duration allowed is {facility.max_booking_hours} hours.
            </span>
          </div>
        )}

        {clash && clash !== "max_exceeded" && (
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
