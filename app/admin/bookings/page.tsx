import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import AdminBookingList from "./AdminBookingList";
import { getActivePropertyId } from "@/lib/property-context.server";
import BookForResidentButton from "@/components/bookings/BookForResidentButton";
import BookingWeek from "@/components/bookings/BookingWeek";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const admin = await requireUser(["Admin"]);
  const propertyId = await getActivePropertyId();

  // 2. Fetch all bookable facilities with property relation
  const allFacilities = await prisma.facility.findMany({
    where: { is_bookable: true },
    include: { property: true },
    orderBy: { facility_name: "asc" },
  });

  // Active property-scoped facilities for the "New Booking" form
  const activeFacilities = propertyId
    ? allFacilities.filter((f) => f.property_id === propertyId)
    : allFacilities;

  // 3. Bookings for the property chosen in the top bar.
  //
  // This used to fetch every booking in the database and let a client-side
  // picker do the scoping. That picker seeded its state from the active
  // property and never re-synced, so switching the top bar to Desa Harmoni
  // left the list filtering on Testing and showing nothing - the same fault
  // DEV-136 found in LeasesClient. A booking belongs to exactly one property,
  // so the server scopes it and the redundant picker is gone.
  const allBookings = await prisma.booking.findMany({
    // Scoped by the FACILITY's property, not the tenant's. A booking is an
    // event in a physical space: the manager of the building whose pool is
    // booked needs to see it, whoever made it. Matching on either side made
    // the one cross-property booking in the data appear under both.
    where: propertyId ? { facility: { property_id: propertyId } } : undefined,
    include: {
      facility: {
        include: {
          property: true,
        },
      },
      lease: {
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenant: { select: { user_name: true } },
        },
      },
      /*
       * Who holds the booking, for the rows that carry no tenancy (DEV-284).
       * An office booking is deliberately lease-less, but so is one old
       * resident row from July whose link was never set — "The office" would
       * be a lie on that one. The role decides which it is.
       */
      user: { select: { user_name: true, role: true } },
    },
    orderBy: { start_time: "desc" },
  });

  // 4. Fetch active leases for the "New Booking" form
  const leases = await prisma.tenantLease.findMany({
    where: {
      status: "Active",
      ...(propertyId ? { unit: { property_id: propertyId } } : {}),
    },
    include: {
      unit: true,
      tenant: { select: { user_name: true } },
    },
    orderBy: { unit: { unit_number: "asc" } },
  });

  // AGENTS.md Rule 6: Prisma Decimal cannot cross into a Client Component.
  // Spreading the booking carried lease.unit with area_sqft and monthly_rent
  // still Decimal - 48 console errors per load. The list reads the unit number
  // and the property name, so it is passed exactly those.
  const serializedBookings = allBookings.map((b) => ({
    booking_id: b.booking_id,
    booking_status: b.booking_status,
    facility_id: b.facility_id,
    purpose: b.purpose,
    pax_count: b.pax_count,
    cancellation_reason: b.cancellation_reason,
    booking_date: b.booking_date.toISOString(),
    start_time: b.start_time.toISOString(),
    end_time: b.end_time.toISOString(),
    heldBy: b.user ? { user_name: b.user.user_name, role: b.user.role } : null,
    facility: b.facility
      ? {
          facility_id: b.facility.facility_id,
          facility_name: b.facility.facility_name,
          // The photo the resident booking card already uses. The serializer
          // picks fields one by one, so it had to be added here to reach the
          // card as a background wash.
          image_url: b.facility.image_url,
          property: b.facility.property
            ? {
                property_id: b.facility.property.property_id,
                property_name: b.facility.property.property_name,
              }
            : null,
        }
      : null,
    lease: b.lease
      ? {
          lease_id: b.lease.lease_id,
          tenant: b.lease.tenant ? { user_name: b.lease.tenant.user_name } : null,
          unit: b.lease.unit
            ? {
                unit_id: b.lease.unit.unit_id,
                unit_number: b.lease.unit.unit_number,
                property: b.lease.unit.property
                  ? {
                      property_id: b.lease.unit.property.property_id,
                      property_name: b.lease.unit.property.property_name,
                    }
                  : null,
              }
            : null,
        }
      : null,
  }));

  // Same rule: the booking form only needs to label each lease.
  const serializedLeases = leases.map((l) => ({
    lease_id: l.lease_id,
    tenant: l.tenant ? { user_name: l.tenant.user_name } : null,
    unit: l.unit ? { unit_id: l.unit.unit_id, unit_number: l.unit.unit_number } : null,
  }));

  // AdminFacilityBooking renders facility_type on the picker card and
  // property.property_name in the booking header. Both were dropped when this
  // serialisation was narrowed in DEV-143, so the type subtitle went blank and
  // selecting any facility crashed the page on property_name of undefined.
  const serializedActiveFacilities = activeFacilities.map((f) => ({
    facility_id: f.facility_id,
    facility_name: f.facility_name,
    facility_type: f.facility_type,
    property_id: f.property_id,
    property: { property_name: f.property?.property_name ?? "" },
    open_time: f.open_time,
    close_time: f.close_time,
    operation_days: f.operation_days,
    max_capacity: f.max_capacity,
    max_booking_hours: f.max_booking_hours,
    facility_status: f.facility_status,
    next_maintenance_date: f.next_maintenance_date
      ? f.next_maintenance_date.toISOString().slice(0, 10)
      : null,
  }));

  // The filter dropdown listed every bookable facility in the portfolio while
  // the page showed one property, so it offered Olympic Swimming Pool (Testing)
  // to someone looking at Desa Harmoni.
  const serializedFacilities = activeFacilities.map((f) => ({
    facility_id: f.facility_id,
    facility_name: f.facility_name,
    property_id: f.property_id,
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="What is free, what is taken, and anything that collides. You can book for a resident who calls or walks in, or hold a slot for the office."
        actions={
          <BookForResidentButton
            facilities={serializedActiveFacilities as any}
            bookings={serializedBookings as any}
            leases={serializedLeases as any}
            adminName={admin.user_name}
          />
        }
      />

      {/*
        The week, before the list (DEV-268). A booking screen exists so
        somebody can answer "is the hall free on Saturday" — a question a
        list sorted by date answers only by being read in full, and one it
        cannot answer at all for a clash. Both read `serializedBookings`,
        so the grid costs no extra query and the two cannot disagree.
      */}
      <BookingWeek facilities={serializedFacilities} bookings={serializedBookings} />

      <AdminBookingList
        bookings={serializedBookings as any}
        facilities={serializedFacilities}
      />
    </div>
  );
}
