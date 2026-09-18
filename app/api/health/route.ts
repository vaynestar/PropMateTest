import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Keep-warm ping (user, 2026-09-18: invoices slow after the database sleeps).
 * Neon's free compute suspends after ~5 minutes idle and takes ~1 s to wake;
 * .github/workflows/keep-warm.yml calls this on a schedule so the first
 * resident of the day doesn't pay that. Returns no data - just "ok" and how
 * long one trivial query took.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db_ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
