import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { minutesMY } from "@/lib/booking-time";
import { isUuid } from "@/lib/uuid";
import { ACTIVE_LEASE_ORDER } from "@/lib/resident";

export const dynamic = "force-dynamic";

/**
 * What is taken on one facility, on one day, right now (DEV-251).
 *
 * The booking form was drawn from a server render and never looked again.
 * Two phones on the same slot therefore both showed it free: the second was
 * refused by the advisory lock in createBooking - correctly - but its form
 * still showed the hour as available, so the obvious next move was to press
 * Confirm again. And a page left open on another phone stayed wrong until
 * someone thought to reload it.
 *
 * This is what the form polls, and what it re-reads the moment the server
 * says it lost a race.
 *
 * The proxy skips /api/* (AGENTS.md Rule 5), so the session and the scope are
 * checked here: a resident may only look at a facility in their own property.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const facilityId = (searchParams.get("facilityId") ?? "").trim();
    const date = (searchParams.get("date") ?? "").trim();

    if (!isUuid(facilityId)) {
      return NextResponse.json({ error: "A facility is required." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "A date of the form YYYY-MM-DD is required." }, { status: 400 });
    }

    const facility = await prisma.facility.findUnique({
      where: { facility_id: facilityId },
      select: { property_id: true },
    });
    if (!facility) {
      return NextResponse.json({ error: "That facility no longer exists." }, { status: 404 });
    }

    if (user.role !== "Admin") {
      const lease = await prisma.tenantLease.findFirst({
        where: { user_id: user.userId, status: "Active" },
        orderBy: ACTIVE_LEASE_ORDER,
        select: { unit: { select: { property_id: true } } },
      });
      if (lease?.unit?.property_id !== facility.property_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const bookings = await prisma.booking.findMany({
      where: {
        facility_id: facilityId,
        // A @db.Date column: the day itself, read as UTC midnight.
        booking_date: new Date(`${date}T00:00:00.000Z`),
        booking_status: { notIn: ["Cancelled", "Rejected"] },
      },
      select: { booking_id: true, start_time: true, end_time: true },
      orderBy: { start_time: "asc" },
    });

    return NextResponse.json(
      {
        facilityId,
        date,
        checkedAt: new Date().toISOString(),
        slots: bookings.map((b) => ({
          booking_id: b.booking_id,
          start_min: minutesMY(b.start_time),
          end_min: minutesMY(b.end_time),
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to read the day's bookings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
