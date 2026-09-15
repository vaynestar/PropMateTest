import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  cancelBooking,
  createBooking,
  listBookings,
} from "@/lib/booking-management";

/*
 * Admin only. The proxy skips /api/*, and these handlers only checked that
 * *someone* was logged in - so any resident could list every tenant's full user
 * row (password_hash, IC) through GET, and create or cancel on anyone's behalf
 * through POST/PUT. No screen calls them: the resident portal uses server
 * actions, which scope to the session user. Found in the resident portal review.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facility") ?? undefined;
    const bookings = await listBookings(facilityId);
    return NextResponse.json(bookings);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch bookings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const body = await request.json();
    const booking = await createBooking(
      {
        facility_id: String(body.facility_id),
        user_id: user.userId,
        booking_date: String(body.booking_date),
        start_time: String(body.start_time),
        end_time: String(body.end_time),
        purpose: body.purpose ? String(body.purpose) : undefined,
      },
      user.userId
    );
    return NextResponse.json(booking, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const body = await request.json();
    if (!body.booking_id) throw new Error("Booking ID is required");
    await cancelBooking(body.booking_id, user.userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
