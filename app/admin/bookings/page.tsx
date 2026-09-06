import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminFacilityBooking from "./AdminFacilityBooking";
import AdminBookingList from "./AdminBookingList";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireUser(["Admin"]);
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
    where: propertyId
      ? {
          OR: [
            { facility: { property_id: propertyId } },
            { lease: { unit: { property_id: propertyId } } },
          ],
        }
      : undefined,
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
    facility: b.facility
      ? {
          facility_id: b.facility.facility_id,
          facility_name: b.facility.facility_name,
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

  const serializedActiveFacilities = activeFacilities.map((f) => ({
    facility_id: f.facility_id,
    facility_name: f.facility_name,
    property_id: f.property_id,
    open_time: f.open_time,
    close_time: f.close_time,
    operation_days: f.operation_days,
    max_capacity: f.max_capacity,
    max_booking_hours: f.max_booking_hours,
    facility_status: f.facility_status,
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Bookings</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Who has booked what, and when. Book on a resident&apos;s behalf if they call or
            come to the office.
          </p>
        </div>
      </div>

      <ExpandableForm title="Book on a resident's behalf" buttonLabel="New Booking" defaultOpen={false}>
        <AdminFacilityBooking
          facilities={serializedActiveFacilities as any}
          bookings={serializedBookings as any}
          leases={serializedLeases as any}
        />
      </ExpandableForm>

      <AdminBookingList
        bookings={serializedBookings as any}
        facilities={serializedFacilities}
      />
    </div>
  );
}
