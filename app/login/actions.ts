"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string };

/** Wrong passwords in a row before the account is shut. */
const LOCK_AFTER = 5;
/** How long it stays shut, in minutes. */
const LOCK_MINUTES = 15;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  // The hash is omitted on the client by default (lib/prisma.ts); signing in
  // is one of the few places that needs it.
  const user = await prisma.user.findUnique({
    where: { user_email: email },
    omit: { password_hash: false },
  });
  // An account that is still inside its lock window is refused before the
  // password is even checked, so a guess learns nothing from the timing.
  if (user?.locked_until && user.locked_until > new Date()) {
    const mins = Math.max(1, Math.ceil((user.locked_until.getTime() - Date.now()) / 60000));
    return {
      error: `Too many failed sign-in attempts. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    if (user) {
      // Count the attempt, and shut the account once the threshold is reached.
      // The counter restarts with the lock, so the next five wrong guesses
      // after it expires shut it again.
      const attempts = user.failed_login_count + 1;
      const locking = attempts >= LOCK_AFTER;
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: {
          failed_login_count: locking ? 0 : attempts,
          locked_until: locking ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
        },
      });
      if (locking) {
        return {
          error: `Too many failed sign-in attempts. Please try again in ${LOCK_MINUTES} minutes.`,
        };
      }
    }
    return { error: "Invalid email or password." };
  }

  // A correct password clears the slate.
  if (user.failed_login_count > 0 || user.locked_until) {
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { failed_login_count: 0, locked_until: null },
    });
  }

  await createSession(user.user_id, user.role, user.user_name, user.user_email);

  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    if (user.role === "Admin" && (redirectTo.startsWith("/admin") || redirectTo.startsWith("/print"))) {
      redirect(redirectTo);
    }
    if (user.role === "Resident" && redirectTo.startsWith("/resident")) {
      redirect(redirectTo);
    }
  }

  if (user.role === "Resident") redirect("/resident");
  redirect("/admin");
}
