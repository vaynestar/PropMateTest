import { NextRequest, NextResponse } from "next/server";
import { getAllLeases } from "@/lib/lease-management";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      // 403, like every other admin-only handler: the caller is signed in,
      // they are simply not allowed (QC case S16).
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const leases = await getAllLeases();
    return NextResponse.json(leases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
