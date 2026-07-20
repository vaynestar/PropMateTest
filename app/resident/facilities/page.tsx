import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listFacilities } from "@/lib/facility-management";
import { listBookings } from "@/lib/booking-management";
import FacilityBookingCard from "./FacilityBookingCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Facilities" };

export default async function ResidentFacilitiesPage() {
  await requireUser();
  const facilities = await listFacilities();
  const raw = await listBookings();
  const bookings = raw.map((b) => ({
    booking_id: b.booking_id,
    booking_date:
      b.booking_date instanceof Date
        ? b.booking_date.toISOString().slice(0, 10)
        : String(b.booking_date),
    start_time:
      b.start_time instanceof Date
        ? b.start_time.toTimeString().slice(0, 5)
        : String(b.start_time),
    end_time:
      b.end_time instanceof Date
        ? b.end_time.toTimeString().slice(0, 5)
        : String(b.end_time),
    booking_status: b.booking_status,
  }));

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-xl p-6">
        <h1 className="font-title-lg text-title-lg text-on-surface">
          Facilities Booking
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Pick your own time. The bar below shows each facility&apos;s booked
          windows for the selected day so everyone can see availability at a
          glance.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {facilities.map((f) => (
          <FacilityBookingCard
            key={f.facility_id}
            facility={f}
            bookings={bookings}
          />
        ))}
      </div>
    </div>
  );
}
