import prisma from "@/lib/prisma";

export async function listBookings(facilityId?: string) {
  return prisma.booking.findMany({
    where: facilityId ? { facility_id: facilityId } : undefined,
    orderBy: [{ booking_date: "desc" }, { start_time: "asc" }],
    include: { facility: { include: { property: true } }, user: true },
  });
}

export async function getBookingsByFacilityAndDate(
  facilityId: string,
  bookingDate: string
) {
  return prisma.booking.findMany({
    where: {
      facility_id: facilityId,
      booking_date: new Date(bookingDate),
      booking_status: { not: "Cancelled" },
    },
    orderBy: { start_time: "asc" },
  });
}

export type BookingInput = {
  facility_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose?: string;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export async function createBooking(input: BookingInput, createdBy?: string) {
  if (!input.facility_id) throw new Error("Facility is required");
  if (!input.booking_date) throw new Error("Booking date is required");
  if (!input.start_time || !input.end_time) {
    throw new Error("Start and end time are required");
  }

  const start = toMinutes(input.start_time);
  const end = toMinutes(input.end_time);
  if (end <= start) {
    throw new Error("End time must be after start time");
  }

  const facility = await prisma.facility.findUnique({
    where: { facility_id: input.facility_id },
  });
  if (!facility) throw new Error("Facility not found");
  if (!facility.is_bookable) {
    throw new Error("This facility is not open for booking");
  }

  const requestedDate = new Date(input.booking_date);

  const overlapping = await prisma.booking.findFirst({
    where: {
      facility_id: input.facility_id,
      booking_date: requestedDate,
      booking_status: { not: "Cancelled" },
      start_time: { lt: input.end_time },
      end_time: { gt: input.start_time },
    },
  });

  if (overlapping) {
    throw new Error(
      "This time slot overlaps an existing booking. Please choose another slot."
    );
  }

  return prisma.booking.create({
    data: {
      facility_id: input.facility_id,
      user_id: input.user_id,
      booking_date: requestedDate,
      start_time: input.start_time,
      end_time: input.end_time,
      purpose: input.purpose,
      booking_status: "Reserved",
      pax_count: 1,
      created_by: createdBy,
    },
  });
}

export async function cancelBooking(bookingId: string, modifiedBy?: string) {
  const trimmed = bookingId.trim();
  if (!trimmed) throw new Error("Booking ID is required");
  return prisma.booking.update({
    where: { booking_id: trimmed },
    data: { booking_status: "Cancelled", modified_by: modifiedBy },
  });
}

export async function listUserBookings(userId: string) {
  return prisma.booking.findMany({
    where: { user_id: userId },
    orderBy: [{ booking_date: "desc" }, { start_time: "asc" }],
    include: { facility: { include: { property: true } } },
  });
}
