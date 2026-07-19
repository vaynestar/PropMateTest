import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "propmate_session";

async function unsign(signed: string | undefined): Promise<boolean> {
  if (!signed) return false;
  const secret = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return false;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(value + secret)
  );
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected.length === mac.length && expected === mac;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPrefixes = ["/admin", "/resident"];
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await unsign(raw))) {
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
