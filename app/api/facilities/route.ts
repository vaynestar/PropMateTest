import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  createFacility,
  deleteFacility,
  listFacilities,
  updateFacility,
} from "@/lib/facility-management";

export async function GET() {
  try {
    const facilities = await listFacilities();
    return NextResponse.json(facilities);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch facilities";
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
    const facility = await createFacility(
      {
        property_id: String(body.property_id),
        facility_name: String(body.facility_name),
        facility_type: String(body.facility_type),
        facility_status: body.facility_status
          ? String(body.facility_status)
          : undefined,
        max_capacity: Number(body.max_capacity),
        is_bookable:
          body.is_bookable === undefined ? true : Boolean(body.is_bookable),
        operation_days: body.operation_days
          ? String(body.operation_days)
          : undefined,
        open_time: body.open_time ? String(body.open_time) : undefined,
        close_time: body.close_time ? String(body.close_time) : undefined,
        max_booking_hours: body.max_booking_hours ? Number(body.max_booking_hours) : null,
      },
      user.userId
    );
    return NextResponse.json(facility, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create facility";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    if (!body.facility_id) throw new Error("Facility ID is required");
    const updated = await updateFacility(
      String(body.facility_id),
      {
        facility_name: body.facility_name
          ? String(body.facility_name)
          : undefined,
        facility_status: body.facility_status
          ? String(body.facility_status)
          : undefined,
        facility_type: body.facility_type
          ? String(body.facility_type)
          : undefined,
        max_capacity:
          body.max_capacity === undefined ? undefined : Number(body.max_capacity),
        is_bookable:
          body.is_bookable === undefined ? undefined : Boolean(body.is_bookable),
        operation_days: body.operation_days
          ? String(body.operation_days)
          : undefined,
        open_time: body.open_time ? String(body.open_time) : undefined,
        close_time: body.close_time ? String(body.close_time) : undefined,
        max_booking_hours: body.max_booking_hours === "" ? null : (body.max_booking_hours ? Number(body.max_booking_hours) : undefined),
      },
      user.userId
    );
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update facility";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Facility ID is required");
    await deleteFacility(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete facility";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
