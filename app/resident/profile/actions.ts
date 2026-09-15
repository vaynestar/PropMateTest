"use server";

import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function changePassword(state: any, formData: FormData) {
  try {
    const user = await requireUser(["Resident"]);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword"));
    const confirmPassword = String(formData.get("confirmPassword"));

    /*
     * R2 (resident review D-10): the password could be changed without the
     * current one, so anyone holding an unlocked phone could take the account
     * over for good. The session proves who logged in, not who is holding the
     * device now.
     */
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
      }
    });

    revalidatePath("/resident/profile");
    return { success: true, message: "Password updated successfully!" };
  } catch (error: any) {
    return { error: error.message || "Failed to update password." };
  }
}
