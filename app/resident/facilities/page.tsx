import { listFacilities } from "@/lib/facility-management";
import { bookingHasEnded } from "@/lib/booking-status";
import { clockMY, minutesMY, todayMY } from "@/lib/booking-time";
import { listUserBookings } from "@/lib/booking-management";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ResidentFacilityTabs from "./ResidentFacilityTabs";
import { ACTIVE_LEASE_ORDER } from "@/lib/resident";

export const dynamic = "force-dynamic";

export default async function ResidentFacilitiesPage() {
  const user = await requireUser(["Resident"]);

  /*
   * Two things this page was not doing.
   *
   * 1. listFacilities() was unscoped, so a resident of Desa Harmoni was shown
   *    - and could book - the Olympic Swimming Pool over in Testing. Scoped to
   *    the property of their own active lease.
   *
   * 2. facility_status was never checked, so a facility an admin had closed for
   *    maintenance still appeared bookable. The admin button's own tooltip says
   *    "Residents will not be able to book this until you reopen it", which was
   *    simply untrue - the same class of false promise DEV-142 found on the
   *    charge-type toggle.
   */
  const lease = await prisma.tenantLease.findFirst({
    where: { user_id: user.userId, status: "Active" },
    orderBy: ACTIVE_LEASE_ORDER,
    select: { unit: { select: { property_id: true } } },
  });
  const propertyId = lease?.unit?.property_id;

  const all = propertyId ? await listFacilities(propertyId) : [];

  const facilities = all
    .filter((f) => f.is_bookable && f.facility_status !== "Maintenance")
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
      image_url: f.image_url,
    }));

  const userBookingsRaw = await listUserBookings(user.userId);
  const myBookings = userBookingsRaw.map((b) => ({
    booking_id: b.booking_id,
    facility_id: b.facility_id,
    facility_name: b.facility.facility_name,
    facility_type: b.facility.facility_type,
    image_url: b.facility.image_url,
    booking_date:
      b.booking_date instanceof Date
        ? b.booking_date.toISOString().slice(0, 10)
        : String(b.booking_date),
    // Pinned to Malaysia time: toTimeString() used the server's zone, so on
    // Vercel (UTC) every booking showed eight hours early.
    start_time: clockMY(b.start_time),
    end_time: clockMY(b.end_time),
    // R4: past bookings are shown as completed and cannot be cancelled.
    is_past: bookingHasEnded(b.end_time),
    booking_status: b.booking_status,
  }));

  /*
   * "Who has booked this day" was drawn from the resident's OWN bookings, and
   * their times arrive here as "18:00" strings - `new Date("18:00")` is an
   * Invalid Date, so every comparison was NaN and the timeline never drew a
   * thing, nor did the clash warning ever fire (R10).
   *
   * It needs every booking on the facility, not just this resident's. Only the
   * two numbers the timeline draws are sent - no names, no purpose - and the
   * clock is read in Malaysia here, on the server, so the view does not depend
   * on the viewer's timezone.
   */
  const slots = facilities.length
    ? (
        await prisma.booking.findMany({
          where: {
            facility_id: { in: facilities.map((f) => f.facility_id) },
            booking_date: { gte: new Date(todayMY()) },
            booking_status: { not: "Cancelled" },
          },
          select: { facility_id: true, booking_date: true, start_time: true, end_time: true },
        })
      ).map((b) => ({
        facility_id: b.facility_id,
        booking_date: b.booking_date.toISOString().slice(0, 10),
        start_min: minutesMY(b.start_time),
        end_min: minutesMY(b.end_time),
      }))
    : [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-1 w-full min-w-0">
        <h1 className="font-headline-md text-headline-md md:text-headline-lg font-bold text-on-surface">
          Book a facility
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Shared facilities in your building. Pick a date and time, and the slot is yours.
        </p>
      </section>

      {/* Main Tabbed Switcher Component */}
      <ResidentFacilityTabs facilities={facilities} myBookings={myBookings} slots={slots} today={todayMY()} />
    </div>
  );
}
