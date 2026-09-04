import { NextResponse } from "next/server";
import { createProperty, listProperties } from "@/lib/property-management";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const properties = await listProperties();
    return NextResponse.json(properties);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch properties";
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
    const property = await createProperty(body, user.userId);
    return NextResponse.json(property, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create property";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
