import { NextResponse } from "next/server";
import { createProperty, listProperties } from "@/lib/property-management";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
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
    const body = await request.json();
    const property = await createProperty(body, user?.userId);
    return NextResponse.json(property, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create property";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
