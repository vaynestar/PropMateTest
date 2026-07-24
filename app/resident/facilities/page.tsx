import { listFacilities } from "@/lib/facility-management";
import { listUserBookings } from "@/lib/booking-management";
import { requireUser } from "@/lib/auth";
import FacilityBooking from "./FacilityBooking";
import ResidentMyBookingsList from "./ResidentMyBookingsList";

export const dynamic = "force-dynamic";

export default async function ResidentFacilitiesPage() {
  const user = await requireUser(["Resident"]);
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

  const userBookingsRaw = await listUserBookings(user.userId);
  const myBookings = userBookingsRaw.map((b) => ({
    booking_id: b.booking_id,
    facility_id: b.facility_id,
    facility_name: b.facility.facility_name,
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
    <div className="space-y-8">
      <section className="flex flex-col gap-1 w-full min-w-0">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface mb-1">
          Reserve Facilities
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Pick a facility, choose your preferred slot, and reserve it instantly.
        </p>
      </section>

      {/* Booking Form Component */}
      {facilities.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No bookable facilities available right now.
        </p>
      ) : (
        <FacilityBooking facilities={facilities} bookings={myBookings} />
      )}

      {/* My Bookings Section */}
      <section className="space-y-4 pt-6 border-t border-outline-variant/30">
        <div className="flex items-center justify-between">
          <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">event_note</span>
            My Active Bookings
          </h2>
          <span className="text-xs text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full font-medium">
            {myBookings.filter((b) => b.booking_status !== "Cancelled").length} active
          </span>
        </div>

        <ResidentMyBookingsList myBookings={myBookings} />
      </section>
    </div>
  );
}
