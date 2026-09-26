import prisma from "@/lib/prisma";
import type { BookingStatusKey } from "@/lib/booking-status";
import { bookingInstant, toMinutes, todayMY, weekdayMY } from "@/lib/booking-time";

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

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The booking rules a facility carries - open days, opening hours, longest
 * booking - were checked by the form and by nothing else (R9). The form is a
 * courtesy: the admin path, the API route and a replayed request all reach
 * here, so the rules live here.
 */
function checkFacilityRules(
  facility: { facility_name: string; operation_days: string; open_time: string; close_time: string; max_booking_hours: number | null },
  bookingDate: string,
  start: number,
  end: number
) {
  const day = weekdayMY(bookingDate);
  const open = facility.operation_days.split(",").map((d) => Number(d.trim()));
  if (!open.includes(day)) {
    throw new Error(`${facility.facility_name} is closed on ${DAY_NAMES[day]}.`);
  }

  const opens = toMinutes(facility.open_time);
  const closes = toMinutes(facility.close_time);
  if (start < opens || end > closes) {
    throw new Error(
      `${facility.facility_name} is open ${facility.open_time} to ${facility.close_time}. Choose a time inside that.`
    );
  }

  if (facility.max_booking_hours && end - start > facility.max_booking_hours * 60) {
    const h = facility.max_booking_hours;
    throw new Error(`${facility.facility_name} can be booked for up to ${h} hour${h === 1 ? "" : "s"} at a time.`);
  }
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

  const day = input.booking_date.slice(0, 10);
  checkFacilityRules(facility, day, start, end);

  // A slot in the past can't be booked. Today is fine until its start passes.
  const today = todayMY();
  if (day < today) {
    throw new Error("That date has passed. Choose today or a later date.");
  }

  const requestedDate = new Date(day);
  // Built as instants in Malaysia time, not with setHours(), which produced a
  // slot eight hours out whenever the code ran on a UTC server (R23).
  const startDt = bookingInstant(day, input.start_time);
  const endDt = bookingInstant(day, input.end_time);

  if (startDt.getTime() <= Date.now()) {
    throw new Error("That time has already passed. Choose a later slot.");
  }

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
