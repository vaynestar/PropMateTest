"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const user = await prisma.user.findUnique({ where: { user_email: email } });
  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.user_id, user.role);

  if (user.role === "Resident") redirect("/resident");
  redirect("/admin");
}
