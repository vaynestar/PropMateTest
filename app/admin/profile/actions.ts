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

function cleanPhone(raw: FormDataEntryValue | null, label: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = String(raw ?? "").trim();
  if (!v) return { ok: true, value: null };
  const digits = v.replace(/\D/g, "");
  if (!/^\+?[0-9][0-9 \-]*$/.test(v) || digits.length < 9 || digits.length > 12) {
    return { ok: false, error: `${label}: enter a phone number like 012-345 6789.` };
  }
  return { ok: true, value: v };
}

/**
 * The admin's own contact details.
 *
 * FR-18 names Administrator *and* Resident and promises "view and update their
 * profile details", but this page was read-only apart from the password form —
 * so the requirement was met for one of its two actors. Mirrors
 * app/resident/profile: the office phone is editable, while name, email and
 * role identify the account and are not accepted here.
 */
export async function updateAdminContactDetails(_state: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const phone = cleanPhone(formData.get("phone_number"), "Contact phone");
    if (!phone.ok) return { error: phone.error };

    await prisma.user.update({
      where: { user_id: user.userId },
      data: { phone_number: phone.value, modified_by: user.userId },
    });
    revalidatePath("/admin/profile");
    return { success: true };
  } catch {
    return { error: "Couldn't save. Check your connection and try again." };
  }
}
