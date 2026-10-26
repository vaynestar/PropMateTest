import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/jwt";

const SESSION_COOKIE = "propmate_session";
const SESSION_TTL = 60 * 60 * 24 * 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function createSession(
  userId: string,
  role: string,
  user_name?: string,
  user_email?: string
) {
  const token = await signToken({ userId, role, user_name, user_email });
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    partitioned: isProd,
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    partitioned: isProd,
    path: "/",
    maxAge: 0,
  });
}

export type SessionUser = {
  userId: string;
  role: string;
  user_name: string;
  user_email: string;
};

/*
 * User record cached per-request. Fetches current name, role, and active status
 * so changes made directly in the database (or via profile updates) reflect
 * immediately without waiting for session expiry or requiring logout.
 */
const getActiveUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: { is_active: true, user_name: true, role: true, user_email: true },
  });
});

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const token = await verifyToken(raw);
  if (!token || !token.userId) return null;

  // Verify user is active and pull current profile details directly from the database
  const activeUser = await getActiveUser(token.userId);
  if (!activeUser?.is_active) return null;

  // Sliding Session Window: If active session token is > 24 hours old, silently issue a fresh 7-day token!
  if (token.iat) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ageInSeconds = nowInSeconds - token.iat;
    if (ageInSeconds > 86400) {
      try {
        await createSession(
          token.userId,
          activeUser.role || token.role,
          activeUser.user_name || token.user_name,
          activeUser.user_email || token.user_email
        );
      } catch {
        // Silently catch if cookies cannot be modified during certain server component render passes
      }
    }
  }

  return {
    userId: token.userId,
    role: activeUser.role || token.role,
    user_name: activeUser.user_name || token.user_name || "User",
    user_email: activeUser.user_email || token.user_email || "",
  };
}

export async function requireUser(allowedRoles?: string[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    // A cookie that no longer maps to an active user must be cleared first.
    // Sending it straight to /login loops: the proxy sees a well-formed token
    // on /login and bounces it back to the portal, which bounces it here.
    const jar = await cookies();
    redirect(jar.get(SESSION_COOKIE) ? "/logout?reason=session" : "/login");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/login");
  return user;
}
