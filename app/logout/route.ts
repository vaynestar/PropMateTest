import { NextRequest, NextResponse } from "next/server";

/**
 * Clears the session cookie and goes to /login.
 *
 * A route handler rather than the server action, because it is reached by a
 * redirect from requireUser() when a token outlives its account (R1). Server
 * components cannot delete cookies during render; a route handler can.
 * The attributes mirror createSession() - a partitioned, SameSite=None cookie
 * is only removed by a Set-Cookie with the same attributes.
 */
function clear(req: NextRequest) {
  const login = new URL("/login", req.url);
  const reason = req.nextUrl.searchParams.get("reason");
  if (reason) login.searchParams.set("reason", reason);

  const res = NextResponse.redirect(login);
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("propmate_session", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    partitioned: isProd,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export const GET = clear;
export const POST = clear;
