import { NextResponse } from "next/server";

import { deleteProperty } from "@/lib/property-management";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteProperty(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete property";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
