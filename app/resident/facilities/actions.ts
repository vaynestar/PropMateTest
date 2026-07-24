"use server";

import { createBooking, getBookingsByFacilityAndDate, cancelBooking } from "@/lib/booking-management";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

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

    const existing = await getBookingsByFacilityAndDate(facilityId, bookingDate);
    const clash = existing.find((b) => {
      const bStartDate = new Date(b.start_time);
      const bs = bStartDate.getHours() * 60 + bStartDate.getMinutes();
      const bEndDate = new Date(b.end_time);
      const be = bEndDate.getHours() * 60 + bEndDate.getMinutes();
      return toMin(start) < be && toMin(end) > bs;
    });

    if (clash) {
      throw new Error("This time slot has been booked by others. Please try again.");
    }

    await createBooking({
      facility_id: facilityId,
      user_id: user.userId,
      booking_date: bookingDate,
      start_time: start,
      end_time: end,
      purpose: String(formData.get("purpose") ?? ""),
    });
    
    revalidatePath("/resident/facilities");
    return { success: true, message: "Booking confirmed successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to book facility." };
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

    await cancelBooking(bookingId, user.userId);
    revalidatePath("/resident/facilities");
    return { success: true, message: "Booking cancelled successfully." };
  } catch (error: any) {
    return { error: error.message || "Failed to cancel booking." };
  }
}
