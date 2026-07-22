"use server";

import { revalidatePath } from "next/cache";
import { requireUser, hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function addTenant(state: any, formData: FormData) {
  try {
    const adminUser = await requireUser(["Admin"]);
    const user_name = String(formData.get("user_name")).trim();
    const user_email = String(formData.get("user_email")).trim();
    const phone_number = String(formData.get("phone_number") || "").trim();
    
    if (!phone_number) {
      throw new Error("Phone number is compulsory.");
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { user_email }
    });
    
    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }
    
    const password_hash = hashPassword("Password123!");
    
    await prisma.user.create({
      data: {
        user_name,
        user_email,
        phone_number,
        password_hash,
        role: "Resident",
        created_by: adminUser.userId,
      }
    });

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/leases"); // Leases uses this list
    return { success: true, message: "Tenant successfully created with default password 'Password123!'" };
  } catch (error: any) {
    return { error: error.message || "Failed to add tenant" };
  }
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
