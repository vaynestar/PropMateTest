import { listFacilities } from "@/lib/facility-management";
import { listBookings } from "@/lib/booking-management";
import FacilityBooking from "./FacilityBooking";

export const dynamic = "force-dynamic";

type BookingDTO = {
  booking_id: string;
  facility_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_status: string;
};

export default async function ResidentFacilitiesPage() {
  const all = await listFacilities();
  const facilities = all
    .filter((f) => f.is_bookable)
    .map((f) => ({
      facility_id: f.facility_id,
      facility_name: f.facility_name,
      facility_type: f.facility_type,
      property: { property_name: f.property.property_name },
      max_capacity: f.max_capacity,
      operation_days: f.operation_days,
      open_time: f.open_time,
      close_time: f.close_time,
      max_booking_hours: f.max_booking_hours,
    }));

  const raw = await listBookings();
  const bookings: BookingDTO[] = raw.map((b) => ({
    booking_id: b.booking_id,
    facility_id: b.facility_id,
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
      <section className="flex flex-col gap-1 w-full min-w-0">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface mb-2">
          Reserve Facilities
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Pick a facility, choose a start and end time, then book it.
        </p>
      </section>

      {facilities.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No bookable facilities available right now.
        </p>
      ) : (
        <FacilityBooking facilities={facilities} bookings={bookings} />
      )}
    </div>
  );
}
