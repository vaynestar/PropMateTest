import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export type FacilityInput = {
  property_id: string;
  facility_name: string;
  facility_type: string;
  facility_status?: string;
  max_capacity: number;
  is_bookable?: boolean;
};

export async function listFacilities() {
  return prisma.facility.findMany({
    orderBy: { facility_name: "asc" },
    include: { property: true, _count: { select: { bookings: true } } },
  });
}

export async function createFacility(input: FacilityInput, createdBy?: string) {
  const name = input.facility_name.trim();
  if (!name) throw new Error("Facility name is required");
  if (!input.property_id) throw new Error("Property is required");
  if (!Number.isFinite(input.max_capacity) || input.max_capacity < 1) {
    throw new Error("Max capacity must be at least 1");
  }

  return prisma.facility.create({
    data: {
      property_id: input.property_id,
      facility_name: name,
      facility_type: input.facility_type,
      facility_status: input.facility_status ?? "Available",
      max_capacity: input.max_capacity,
      is_bookable: input.is_bookable ?? true,
      created_by: createdBy,
    },
  });
}

export async function deleteFacility(facilityId: string) {
  const trimmed = facilityId.trim();
  if (!trimmed) throw new Error("Facility ID is required");
  return prisma.facility.delete({ where: { facility_id: trimmed } });
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
