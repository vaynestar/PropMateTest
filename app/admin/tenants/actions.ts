"use server";

import { revalidatePath } from "next/cache";
import { requireUser, hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "node:crypto";

export async function addTenant(state: any, formData: FormData) {
  try {
    const adminUser = await requireUser(["Admin"]);
    const user_name = String(formData.get("user_name") || "").trim();
    const user_email = String(formData.get("user_email") || "").trim().toLowerCase();
    const phone_number = String(formData.get("phone_number") || "").trim();

    if (!user_name) throw new Error("Full name is required.");
    if (!user_email) throw new Error("Email is required.");
    if (!phone_number) throw new Error("Mobile number is required.");

    const existingUser = await prisma.user.findUnique({ where: { user_email } });
    if (existingUser) {
      throw new Error("Someone already uses that email address.");
    }

    // Every resident used to be created with the same hardcoded password,
    // printed in the form before anyone had typed a name. Generate a unique one
    // instead and return it once so the admin can hand it over.
    const tempPassword = generateTempPassword();

    await prisma.user.create({
      data: {
        user_name,
        user_email,
        phone_number,
        password_hash: hashPassword(tempPassword),
        role: "Resident",
        ic_number: emptyToNull(formData.get("ic_number")),
        vehicle_plate: emptyToNull(formData.get("vehicle_plate"))?.toUpperCase() ?? null,
        emergency_contact_name: emptyToNull(formData.get("emergency_contact_name")),
        emergency_contact_phone: emptyToNull(formData.get("emergency_contact_phone")),
        created_by: adminUser.userId,
      },
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/leases");
    return {
      success: true,
      message: `${user_name} can now sign in with ${user_email}.`,
      tempPassword,
    };
  } catch (error: any) {
    return { error: error.message || "Could not add the tenant" };
  }
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

/** Readable but unguessable — avoids characters that are easy to misread aloud. */
function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PM-${out}`;
}


export async function removeTenant(state: any, formData: FormData) {
  try {
    await requireUser(["Admin"]);
    const user_id = String(formData.get("user_id"));
    
    if (!user_id) throw new Error("User ID is required.");
    
    // Cannot delete a user if they are tied to a lease. Prisma might restrict this via foreign keys,
    // so we just rely on prisma to throw an error, or we can check manually.
    const activeLeases = await prisma.tenantLease.count({
      where: { user_id }
    });
    
    if (activeLeases > 0) {
      throw new Error("Cannot delete tenant. They have active or past leases associated with them.");
    }

    await prisma.user.delete({
      where: { user_id }
    });
    
    revalidatePath("/admin/tenants");
    revalidatePath("/admin/leases");
    return { success: true, message: "Tenant deleted successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to delete tenant" };
  }
}

export async function updateTenant(state: any, formData: FormData) {
  try {
    const adminUser = await requireUser(["Admin"]);
    const user_id = String(formData.get("user_id"));
    const user_name = String(formData.get("user_name")).trim();
    const user_email = String(formData.get("user_email")).trim();
    const phone_number = String(formData.get("phone_number") || "").trim();

    if (!user_id) throw new Error("User ID is required.");
    if (!phone_number) throw new Error("Phone number is compulsory.");

    // Check if new email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { user_email }
    });
    if (existingUser && existingUser.user_id !== user_id) {
      throw new Error("This email is already in use by another account.");
    }

    await prisma.user.update({
      where: { user_id },
      data: {
        user_name,
        user_email,
        phone_number,
        modified_by: adminUser.userId
      }
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/leases");
    return { success: true, message: "Tenant updated successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to update tenant" };
  }
}

export async function resetTenantPassword(user_id: string) {
  try {
    const adminUser = await requireUser(["Admin"]);
    
    // Generate a secure default password. In a real app, send an email.
    const newPassword = "Password123!";
    const password_hash = hashPassword(newPassword);

    await prisma.user.update({
      where: { user_id },
      data: {
        password_hash,
        modified_by: adminUser.userId
      }
    });

    return { success: true, message: `Password reset to: ${newPassword}` };
  } catch (error: any) {
    return { error: error.message || "Failed to reset password" };
  }
}
