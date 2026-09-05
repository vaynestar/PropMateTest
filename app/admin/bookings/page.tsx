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

  // 1. Fetch properties for dropdown filter
  const properties = await prisma.propertyMaster.findMany({
    select: {
      property_id: true,
      property_name: true,
    },
    orderBy: { property_name: "asc" },
  });

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

  // 3. Fetch all bookings with facility & tenant relations
  const allBookings = await prisma.booking.findMany({
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

  const serializedBookings = allBookings.map((b) => ({
    ...b,
    booking_date: b.booking_date.toISOString(),
    start_time: b.start_time.toISOString(),
    end_time: b.end_time.toISOString(),
  }));

  const serializedFacilities = allFacilities.map((f) => ({
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
            Manage resident facility schedules, monitor bookings, and create reservations across properties
          </p>
        </div>
      </div>

      <ExpandableForm title="Book Facility for Resident" buttonLabel="New Booking" defaultOpen={false}>
        <AdminFacilityBooking
          facilities={activeFacilities}
          bookings={serializedBookings}
          leases={leases}
        />
      </ExpandableForm>

      <h2 className="text-xl font-semibold text-white pt-4 border-t border-[#4a4455]">
        Bookings Directory
      </h2>

      <AdminBookingList
        bookings={serializedBookings}
        properties={properties}
        facilities={serializedFacilities}
        defaultPropertyId={propertyId || ""}
      />
    </div>
  );
}
