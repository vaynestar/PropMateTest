import { listFacilities } from "@/lib/facility-management";
import { listUserBookings } from "@/lib/booking-management";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ResidentFacilityTabs from "./ResidentFacilityTabs";

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
    <div className="space-y-6">
      <section className="flex flex-col gap-1 w-full min-w-0">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-on-surface mb-1">
          Book a facility
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Shared facilities in your building. Pick a date and time, and the slot is yours.
        </p>
      </section>

      {/* Main Tabbed Switcher Component */}
      <ResidentFacilityTabs facilities={facilities} myBookings={myBookings} />
    </div>
  );
}
