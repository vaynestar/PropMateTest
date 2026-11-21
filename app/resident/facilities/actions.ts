"use server";

import { createBooking, getBookingsByFacilityAndDate, cancelBooking, isSlotTaken } from "@/lib/booking-management";
import { clockMY } from "@/lib/booking-time";
import { bookingHasEnded } from "@/lib/booking-status";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ACTIVE_LEASE_ORDER } from "@/lib/resident";

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function bookFacility(state: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Unauthorized" };

    const facilityId = String(formData.get("facility_id"));
    const bookingDate = String(formData.get("booking_date"));
    const start = String(formData.get("start_time"));
    const end = String(formData.get("end_time"));

    if (toMin(end) <= toMin(start)) {
      throw new Error("End time must be after start time.");
    }

    /*
     * createBooking() already refuses a non-bookable facility and one closed
     * for maintenance. What nothing checked is WHOSE property it is: this
     * action takes a facility_id straight from the form, so a resident of one
     * property could book another property's pool. The page now lists only
     * their own property's facilities, but a list is a courtesy, not a guard.
     */
    const facility = await prisma.facility.findUnique({
      where: { facility_id: facilityId },
      select: { property_id: true },
    });
    if (!facility) throw new Error("That facility no longer exists.");

    const lease = await prisma.tenantLease.findFirst({
      where: { user_id: user.userId, status: "Active" },
    orderBy: ACTIVE_LEASE_ORDER,
      select: { lease_id: true, unit: { select: { property_id: true } } },
    });
    if (!lease) {
      throw new Error("You need an active lease to book a facility.");
    }
    if (lease.unit?.property_id !== facility.property_id) {
      throw new Error("You can only book facilities in your own property.");
    }

    /*
     * A courtesy check so the common case gets a specific message. The guard
     * that actually prevents a double booking is the advisory lock inside
     * createBooking - this one reads getHours(), which is the viewer's... no:
     * the SERVER's timezone, and on Vercel that is UTC. Read the clock in
     * Malaysia like everything else in the booking path (lib/booking-time).
     */
    const existing = await getBookingsByFacilityAndDate(facilityId, bookingDate);
    const clash = existing.find((b) => {
      const bs = toMin(clockMY(b.start_time));
      const be = toMin(clockMY(b.end_time));
      return toMin(start) < be && toMin(end) > bs;
    });

    if (clash) {
      return {
        error: `Someone booked ${clockMY(clash.start_time)}–${clockMY(clash.end_time)} just before you.`,
        conflict: true,
      };
    }

    await createBooking(
      {
        facility_id: facilityId,
        user_id: user.userId,
        lease_id: lease.lease_id,
        booking_date: bookingDate,
        start_time: start,
        end_time: end,
        purpose: String(formData.get("purpose") ?? "") || undefined,
        pax_count: Number(formData.get("pax_count") || 1),
      },
      user.userId
    );
    
    revalidatePath("/resident/facilities");
    return { success: true, message: "Your slot is reserved. It is under My Bookings." };
  } catch (error: any) {
    const message = error?.message || "Failed to book facility.";
    // A lost race is not a broken form: say so, and the client re-reads the day.
    return { error: message, conflict: isSlotTaken(message) };
  }
}

export async function cancelResidentBookingAction(bookingId: string) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: "Unauthorized" };

    const booking = await prisma.booking.findUnique({
      where: { booking_id: bookingId },
    });
    if (!booking) return { error: "Booking not found." };
    if (booking.user_id !== user.userId) {
      return { error: "Unauthorized: You can only cancel your own bookings." };
    }
    if (booking.booking_status === "Cancelled") {
      return { error: "This booking is already cancelled." };
    }
    // R4: a booking that has already happened was still cancellable, which
    // rewrote history - the facility was used, the record said it wasn't.
    if (bookingHasEnded(booking.end_time)) {
      return { error: "This booking has already taken place, so it can't be cancelled." };
    }

    await cancelBooking(bookingId, user.userId);
    revalidatePath("/resident/facilities");
    return { success: true, message: "Booking cancelled successfully." };
  } catch (error: any) {
    return { error: error.message || "Failed to cancel booking." };
  }
}
