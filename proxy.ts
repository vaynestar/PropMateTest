import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "propmate_session";

async function hasValidToken(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const secret =
    process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
  const key = new TextEncoder().encode(secret);
  try {
    await jwtVerify(raw, key);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPrefixes = ["/admin", "/resident"];
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await hasValidToken(raw))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/resident/:path*"],
};
