import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminFacilityBooking from "./AdminFacilityBooking";
import AdminBookingList from "./AdminBookingList";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;

  const facilities = await prisma.facility.findMany({
    where: { 
      is_bookable: true,
      ...(propertyId ? { property_id: propertyId } : {})
    },
    include: { property: true },
    orderBy: { facility_name: "asc" },
  });

  const bookings = await prisma.booking.findMany({
    where: propertyId ? { facility: { property_id: propertyId } } : undefined,
    include: {
      facility: true,
      lease: {
        include: {
          unit: true,
          tenant: { select: { user_name: true } },
        }
      }
    },
    orderBy: { start_time: "desc" },
  });

  const leases = await prisma.tenantLease.findMany({
    where: { 
      status: "Active",
      ...(propertyId ? { unit: { property_id: propertyId } } : {})
    },
    include: {
      unit: true,
      tenant: { select: { user_name: true } },
    },
    orderBy: { unit: { unit_number: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Bookings</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage all resident facility bookings and create bookings on their behalf
          </p>
        </div>
      </div>

      <ExpandableForm title="Book Facility for Resident" buttonLabel="New Booking" defaultOpen={false}>
        {/* We need to pass serializable strings/numbers instead of raw Dates where possible, but prisma returns dates. We map them to strings before passing to client components. */}
        <AdminFacilityBooking 
          facilities={facilities} 
          bookings={bookings.map(b => ({
            ...b,
            booking_date: b.booking_date.toISOString(),
            start_time: b.start_time.toISOString(),
            end_time: b.end_time.toISOString()
          }))} 
          leases={leases} 
        />
      </ExpandableForm>

      <h2 className="text-xl font-semibold text-white pt-4 border-t border-[#4a4455]">
        All Bookings
      </h2>
      
      <AdminBookingList bookings={bookings.map(b => ({
            ...b,
            booking_date: b.booking_date.toISOString(),
            start_time: b.start_time.toISOString(),
            end_time: b.end_time.toISOString()
          }))} />
    </div>
  );
}
