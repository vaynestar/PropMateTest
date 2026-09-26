"use server";

import { revalidatePath } from "next/cache";
import { createBooking } from "@/lib/booking-management";
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

    if (!facility_id || !lease_id || !booking_date_str || !start_time_str || !end_time_str) {
      throw new Error("Missing required fields");
    }

    const lease = await prisma.tenantLease.findUnique({
      where: { lease_id },
      select: { user_id: true },
    });

    if (!lease) {
      throw new Error("Invalid lease selected");
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
        user_id: lease.user_id,
        lease_id,
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
    return { error: error.message };
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
