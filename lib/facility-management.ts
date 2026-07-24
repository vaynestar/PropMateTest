import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type FacilityInput = {
  property_id: string;
  facility_name: string;
  facility_type: string;
  facility_status?: string;
  max_capacity?: number | null;
  is_bookable?: boolean;
  operation_days?: string;
  open_time?: string;
  close_time?: string;
  max_booking_hours?: number | null;
  next_maintenance_date?: Date | string | null;
};

export async function listFacilities(propertyId?: string) {
  return prisma.facility.findMany({
    where: propertyId ? { property_id: propertyId } : undefined,
    orderBy: { facility_name: "asc" },
    include: { property: true, _count: { select: { bookings: true } } },
  });
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function createFacility(input: FacilityInput, createdBy?: string) {
  const name = input.facility_name.trim();
  if (!name) throw new Error("Facility name is required");
  if (!input.property_id) throw new Error("Property is required");

  const capacity = (input.max_capacity && Number(input.max_capacity) > 0)
    ? Number(input.max_capacity)
    : null;

  const nextMaint = input.next_maintenance_date ? new Date(input.next_maintenance_date) : null;

  const open_time = input.open_time ?? "08:00";
  const close_time = input.close_time ?? "22:00";
  if (toMinutes(close_time) <= toMinutes(open_time)) {
    throw new Error("Closing time must be after opening time");
  }

  return prisma.facility.create({
    data: {
      property_id: input.property_id,
      facility_name: name,
      facility_type: input.facility_type.trim() || "General",
      facility_status: input.facility_status ?? "Available",
      max_capacity: capacity,
      is_bookable: input.is_bookable ?? true,
      operation_days: input.operation_days ?? "1,2,3,4,5,6,7",
      open_time,
      close_time,
      max_booking_hours: input.max_booking_hours ?? null,
      next_maintenance_date: nextMaint,
      created_by: createdBy,
    },
  });
}

export async function deleteFacility(facilityId: string) {
  const trimmed = facilityId.trim();
  if (!trimmed) throw new Error("Facility ID is required");
  return prisma.facility.delete({ where: { facility_id: trimmed } });
}

export type FacilityUpdateInput = Partial<{
  facility_name: string;
  facility_status: string;
  facility_type: string;
  max_capacity: number | null;
  is_bookable: boolean;
  operation_days: string;
  open_time: string;
  close_time: string;
  max_booking_hours: number | null;
  next_maintenance_date: Date | string | null;
}>;

export async function updateFacility(
  facilityId: string,
  input: FacilityUpdateInput,
  modifiedBy?: string
) {
  const trimmed = facilityId.trim();
  if (!trimmed) throw new Error("Facility ID is required");

  if (input.open_time && input.close_time) {
    if (toMinutes(input.close_time) <= toMinutes(input.open_time)) {
      throw new Error("Closing time must be after opening time");
    }
  }

  const dataToUpdate: any = {
    ...input,
    modified_by: modifiedBy,
  };

  if (input.next_maintenance_date !== undefined) {
    dataToUpdate.next_maintenance_date = input.next_maintenance_date
      ? new Date(input.next_maintenance_date)
      : null;
  }

  return prisma.facility.update({
    where: { facility_id: trimmed },
    data: dataToUpdate,
  });
}

export type FacilityWithBookings = Prisma.FacilityGetPayload<{
  include: { property: true; bookings: { orderBy: { booking_date: "desc" } } };
}>;

export async function getFacilityWithBookings(
  facilityId: string
): Promise<FacilityWithBookings | null> {
  return prisma.facility.findUnique({
    where: { facility_id: facilityId },
    include: {
      property: true,
      bookings: { orderBy: { booking_date: "desc" } },
    },
  });
}
