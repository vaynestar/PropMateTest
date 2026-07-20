"use server";

import { createBooking } from "@/lib/booking-management";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function bookFacility(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  await createBooking({
    facility_id: String(formData.get("facility_id")),
    user_id: user.userId,
    booking_date: String(formData.get("booking_date")),
    start_time: String(formData.get("start_time")),
    end_time: String(formData.get("end_time")),
    purpose: String(formData.get("purpose") ?? ""),
  });
  revalidatePath("/resident/facilities");
}
