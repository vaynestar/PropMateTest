import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type TokenPayload = {
  userId: string;
  role: string;
};

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecretKey());
}

export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      role: typeof payload.role === "string" ? payload.role : "",
    };
  } catch {
    return null;
  }
}
