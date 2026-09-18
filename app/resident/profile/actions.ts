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

/** Malaysian-style phone: digits, spaces, dashes, optional +; 9-12 digits. */
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
 * DEV-189: a resident keeps their own contact details current - mobile, car
 * plate, emergency contact. Name, email and IC are not accepted here.
 */
export async function updateContactDetails(_state: any, formData: FormData) {
  try {
    const user = await requireUser(["Resident"]);
    const phone = cleanPhone(formData.get("phone_number"), "Mobile number");
    if (!phone.ok) return { error: phone.error };
    const ePhone = cleanPhone(formData.get("emergency_contact_phone"), "Emergency contact phone");
    if (!ePhone.ok) return { error: ePhone.error };
    const plate = String(formData.get("vehicle_plate") ?? "").trim().toUpperCase().replace(/\s+/g, " ");
    if (plate.length > 15) return { error: "Car plate: keep it under 15 characters." };
    const eName = String(formData.get("emergency_contact_name") ?? "").trim();
    if (eName.length > 80) return { error: "Emergency contact name: keep it under 80 characters." };

    await prisma.user.update({
      where: { user_id: user.userId },
      data: {
        phone_number: phone.value,
        vehicle_plate: plate || null,
        emergency_contact_name: eName || null,
        emergency_contact_phone: ePhone.value,
        modified_by: user.userId,
      },
    });
    revalidatePath("/resident/profile");
    return { success: true };
  } catch {
    return { error: "Couldn't save. Check your connection and try again." };
  }
}
