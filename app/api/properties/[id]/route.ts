import { NextResponse } from "next/server";
import { deleteProperty } from "@/lib/property-management";
import { getSessionUser } from "@/lib/auth";
import { isUuid } from "@/lib/uuid";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    // property_id is @db.Uuid: a malformed id threw a 500 (R8).
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
    await deleteProperty(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete property";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
