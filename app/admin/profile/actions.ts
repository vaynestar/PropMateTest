"use server";

import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function changeAdminPassword(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

    // R2 parity: the admin account had the same hole as the resident one, with
    // more at stake - an unlocked office screen was enough to take it over.
    const account = await prisma.user.findUnique({
      where: { user_id: user.userId },
      select: { password_hash: true },
    });
    if (!account || !currentPassword || !verifyPassword(currentPassword, account.password_hash)) {
      throw new Error("Your current password is incorrect.");
    }
    if (newPassword === currentPassword) {
      throw new Error("Choose a new password that is different from your current one.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const password_hash = hashPassword(newPassword);

    await prisma.user.update({
      where: { user_id: user.userId },
      data: {
        password_hash,
      },
    });

    revalidatePath("/admin/profile");
    return { success: true, message: "Password updated successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to update password." };
  }
}
