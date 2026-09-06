"use server";

import { revalidatePath } from "next/cache";
import { createLease, updateLease, deleteLease, reassignLease } from "@/lib/lease-management";
import { getSessionUser, requireUser } from "@/lib/auth";

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

export async function adminUpdateLease(state: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      throw new Error("Unauthorized");
    }

    const lease_id = formData.get("lease_id") as string;
    const move_in_date = formData.get("move_in_date") as string;
    const move_out_date = formData.get("move_out_date") as string;

    if (!lease_id || !move_in_date) {
      throw new Error("Required fields missing");
    }

    await updateLease(lease_id, {
      move_in_date,
      move_out_date: move_out_date || null,
    }, user.userId);

    revalidatePath("/admin/leases");
    revalidatePath("/admin/tenants");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}


/** Remove a lease created by mistake. Refuses once anything has been billed. */
export async function adminDeleteLease(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const lease_id = String(formData.get("lease_id") || "");
    if (!lease_id) throw new Error("Lease ID is required.");

    const { unit_number } = await deleteLease(lease_id);

    revalidatePath("/admin/leases");
    revalidatePath("/admin/units");
    revalidatePath("/admin/tenants");
    return { success: true, message: `Lease deleted. ${unit_number} is vacant again.` };
  } catch (error: any) {
    return { error: error.message || "Could not delete the lease" };
  }
}

/** Move a lease to a different unit or tenant, before anything is invoiced. */
export async function adminReassignLease(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const lease_id = String(formData.get("lease_id") || "");
    const unit_id = String(formData.get("unit_id") || "");
    const user_id = String(formData.get("user_id") || "");
    if (!lease_id || !unit_id || !user_id) {
      throw new Error("Lease, unit and tenant are all required.");
    }

    await reassignLease(lease_id, { unit_id, user_id }, user.userId);

    revalidatePath("/admin/leases");
    revalidatePath("/admin/units");
    revalidatePath("/admin/tenants");
    return { success: true, message: "Lease updated." };
  } catch (error: any) {
    return { error: error.message || "Could not update the lease" };
  }
}
