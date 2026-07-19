import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

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

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
  const mac = createHash("sha256").update(value + secret).digest("hex");
  return `${value}.${mac}`;
}

function unsign(signed: string): string | null {
  const secret = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHash("sha256").update(value + secret).digest("hex");
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return value;
}

export async function createSession(userId: string, role: string) {
  const store = Buffer.from(JSON.stringify({ userId, role })).toString("base64url");
  const signed = sign(store);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
  const store = unsign(raw);
  if (!store) return null;
  try {
    const { userId, role } = JSON.parse(
      Buffer.from(store, "base64url").toString("utf8")
    );
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, role: true, user_name: true, user_email: true, is_active: true },
    });
    if (!user || !user.is_active) return null;
    return {
      userId: user.user_id,
      role: user.role,
      user_name: user.user_name,
      user_email: user.user_email,
    };
  } catch {
    return null;
  }
}

export async function requireUser(allowedRoles?: string[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/login");
  return user;
}
