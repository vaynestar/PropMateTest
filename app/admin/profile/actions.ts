"use server";

import { requireUser, hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function changeAdminPassword(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

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
