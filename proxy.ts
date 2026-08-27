import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const SESSION_COOKIE = "propmate_session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const tokenCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const token = tokenCookie ? await verifyToken(tokenCookie) : null;

  const isAdminRoute = pathname.startsWith("/admin");
  const isResidentRoute = pathname.startsWith("/resident");
  const isPrintRoute = pathname.startsWith("/print");
  const isLoginPage = pathname === "/login";
  const isRootPage = pathname === "/";

  // 1. Direct access to protected routes without a valid session token -> redirect to /login
  if ((isAdminRoute || isResidentRoute || isPrintRoute) && !token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Role-based route authorization & separation
  if (token) {
    // If Resident tries to access Admin pages, redirect to resident portal
    if (isAdminRoute && token.role !== "Admin") {
      return NextResponse.redirect(new URL("/resident", req.url));
    }
    // If Admin tries to access Resident pages, redirect to admin portal
    if (isResidentRoute && token.role !== "Resident") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    // If authenticated user visits /login or root /, redirect to their dashboard
    if (isLoginPage || isRootPage) {
      const destination = token.role === "Admin" ? "/admin" : "/resident";
      return NextResponse.redirect(new URL(destination, req.url));
    }
  } else if (isRootPage) {
    // Unauthenticated user visiting root / -> redirect to /login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled individually)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static assets: favicon.ico, logo.png, manifest.webmanifest, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
