import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  createFacility,
  deleteFacility,
  listFacilities,
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
