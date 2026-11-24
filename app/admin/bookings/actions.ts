"use server";

import { revalidatePath } from "next/cache";
import { createBooking, isSlotTaken } from "@/lib/booking-management";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { normaliseBookingStatus } from "@/lib/booking-status";

export async function adminBookFacility(formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    const facility_id = formData.get("facility_id") as string;
    const lease_id = formData.get("lease_id") as string;
    const booking_date_str = formData.get("booking_date") as string;
    const start_time_str = formData.get("start_time") as string;
    const end_time_str = formData.get("end_time") as string;
    const purpose = String(formData.get("purpose") || "").trim();
    const pax_count = Number(formData.get("pax_count") || 1);

    /*
     * The office can hold a facility for itself (user, 2026-11-25):
     * "facilities booking should allowed for admin to book without binding to
     *  resident ... maybe make an option to choose booking for resident or admin".
     *
     * Every booking had to name a tenancy, so an AGM, a contractor's access, a
     * deep clean or a fire drill could only be recorded by borrowing some
     * resident's name — which puts a booking on their record that they never
     * made. `Booking.lease_id` has always been nullable; nothing but this form
     * required it.
     *
     * An office booking is owned by the admin who made it and carries no
     * lease. Everything else — opening hours, the service date, the overlap
     * lock, capacity — is unchanged, because it all hangs off the facility.
     */
    const bookedFor = formData.get("booked_for") === "office" ? "office" : "resident";

    if (!facility_id || !booking_date_str || !start_time_str || !end_time_str) {
      throw new Error("Missing required fields");
    }

    let bookingUserId = user.userId;
    let bookingLeaseId: string | undefined;

    if (bookedFor === "resident") {
      if (!lease_id) {
        throw new Error("Choose the resident this booking is for.");
      }
      const lease = await prisma.tenantLease.findUnique({
        where: { lease_id },
        select: { user_id: true },
      });
      if (!lease) {
        throw new Error("Invalid lease selected");
      }
      bookingUserId = lease.user_id;
      bookingLeaseId = lease_id;
    }

    /*
     * Routed through createBooking() rather than prisma.booking.create().
     *
     * This action used to write the row directly, which meant it skipped every
     * guard in booking-management: whether the facility is bookable, whether it
     * is closed for maintenance, whether the slot is inside opening hours,
     * whether it overlaps an existing booking, and the maximum duration. The
     * form checks those in the browser, but a form is not a guard - so the
     * facilities page's "Close for maintenance" did nothing to admin bookings,
     * and a double booking was one stale tab away.
     */
    await createBooking(
      {
        facility_id,
        user_id: bookingUserId,
        lease_id: bookingLeaseId,
        booking_date: booking_date_str,
        start_time: start_time_str,
        end_time: end_time_str,
        purpose: purpose || undefined,
        pax_count,
      },
      user.userId
    );

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    const message = error?.message || "Failed to create the booking.";
    // Lost the race for the slot: the form re-reads the day (DEV-251).
    return { error: message, conflict: isSlotTaken(message) };
  }
}

/**
 * `cancellation_reason` was rendered on the booking card and written by
 * nothing, and the update recorded no author - so a resident whose booking the
 * office cancelled was told neither that it happened nor why (R16).
 */
export async function updateBookingStatus(bookingId: string, status: string, reason?: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    // The action wrote whatever string it was handed, so a typo or a retired
    // name like "Reserved" could reach a resident's screen (R23/D-34).
    const next = normaliseBookingStatus(status);
    if (!next) throw new Error(`Unknown booking status: ${status}`);

    const cancelling = next === "Cancelled";
    await prisma.booking.update({
      where: { booking_id: bookingId },
      data: {
        booking_status: next,
        modified_by: user.userId,
        cancellation_reason: cancelling ? reason?.trim() || null : null,
      },
    });

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
