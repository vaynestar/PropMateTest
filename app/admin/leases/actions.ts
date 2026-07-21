"use server";

import { revalidatePath } from "next/cache";
import { createLease } from "@/lib/lease-management";
import { getSessionUser } from "@/lib/auth";

export async function adminCreateLease(state: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    const unit_id = formData.get("unit_id") as string;
    const user_id = formData.get("user_id") as string;
    const move_in_date = formData.get("move_in_date") as string;
    const move_out_date = formData.get("move_out_date") as string;

    if (!unit_id || !user_id || !move_in_date) {
      throw new Error("Required fields missing");
    }

    await createLease({
      unit_id,
      user_id,
      move_in_date,
      move_out_date: move_out_date || undefined,
    }, user.userId);

    revalidatePath("/admin/leases");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
