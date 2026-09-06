import prisma from "@/lib/prisma";
import type { BookingStatusKey } from "@/lib/booking-status";

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
  /** How many people. Was hardcoded to 1 while the list rendered the value. */
  pax_count?: number;
  /** Ties the booking to a tenancy. The admin path sets it; residents do not. */
  lease_id?: string;
  /**
   * Defaults to Confirmed. There is no approval step: booking a facility
   * confirms it, and the overlap check above is what decides whether the slot
   * was available.
   */
  booking_status?: BookingStatusKey;
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
    throw new Error("This facility is not open for booking.");
  }
  if (facility.facility_status === "Maintenance") {
    throw new Error("This facility is currently under maintenance and cannot be booked.");
  }

  const requestedDate = new Date(input.booking_date);

  const startDt = new Date(requestedDate);
  const [sh, sm] = input.start_time.split(":").map(Number);
  startDt.setHours(sh, sm, 0, 0);

  const endDt = new Date(requestedDate);
  const [eh, em] = input.end_time.split(":").map(Number);
  endDt.setHours(eh, em, 0, 0);

  const overlapping = await prisma.booking.findFirst({
    where: {
      facility_id: input.facility_id,
      booking_date: requestedDate,
      booking_status: { not: "Cancelled" },
      start_time: { lt: endDt },
      end_time: { gt: startDt },
    },
  });

  if (overlapping) {
    throw new Error(
      "This time slot overlaps an existing booking. Please choose another slot."
    );
  }

  if (facility.max_capacity && input.pax_count && input.pax_count > facility.max_capacity) {
    throw new Error(
      `${facility.facility_name} holds ${facility.max_capacity} people. You entered ${input.pax_count}.`
    );
  }

  return prisma.booking.create({
    data: {
      facility_id: input.facility_id,
      user_id: input.user_id,
      lease_id: input.lease_id,
      booking_date: requestedDate,
      start_time: startDt,
      end_time: endDt,
      purpose: input.purpose,
      // Was hardcoded "Reserved", a name no filter or KPI in the app knew.
      booking_status: input.booking_status ?? "Confirmed",
      pax_count: input.pax_count && input.pax_count > 0 ? input.pax_count : 1,
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
