import { NextRequest, NextResponse } from "next/server";
import { createVisitor, getAllVisitors } from "@/lib/visitor-management";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admins can see all visitors, residents should only fetch through a dedicated resident logic if needed
    if (user.role === "Admin") {
      const visitors = await getAllVisitors();
      return NextResponse.json(visitors);
    }
    
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const visitor = await createVisitor(data);

    return NextResponse.json(visitor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
