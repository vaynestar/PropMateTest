import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
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
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  userId: string;
  role: string;
  user_name: string;
  user_email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const token = await verifyToken(raw);
  if (!token || !token.userId) return null;

  return {
    userId: token.userId,
    role: token.role,
    user_name: token.user_name || "User",
    user_email: token.user_email || "",
  };
}

export async function requireUser(allowedRoles?: string[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/login");
  return user;
}
