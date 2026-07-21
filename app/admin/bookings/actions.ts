"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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

    const booking_date = new Date(booking_date_str);
    
    // Construct proper datetimes
    const start_time = new Date(booking_date);
    const [sh, sm] = start_time_str.split(":");
    start_time.setHours(Number(sh), Number(sm));

    const end_time = new Date(booking_date);
    const [eh, em] = end_time_str.split(":");
    end_time.setHours(Number(eh), Number(em));

    await prisma.booking.create({
      data: {
        facility_id,
        user_id: lease.user_id,
        lease_id,
        booking_date,
        start_time,
        end_time,
        pax_count: 1, // Default
        booking_status: "Confirmed",
        created_by: user.userId,
      }
    });

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateBookingStatus(bookingId: string, status: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    await prisma.booking.update({
      where: { booking_id: bookingId },
      data: { booking_status: status },
    });

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
