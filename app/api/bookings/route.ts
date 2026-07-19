import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  cancelBooking,
  createBooking,
  listBookings,
} from "@/lib/booking-management";

export async function GET(request: Request) {
  try {
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const body = await request.json();
    if (!body.booking_id) throw new Error("Booking ID is required");
    await cancelBooking(body.booking_id, user?.userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
