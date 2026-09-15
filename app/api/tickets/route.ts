import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  listTickets,
  raiseTicket,
  updateTicketStatus,
} from "@/lib/maintenance";

/*
 * Admin only. The proxy skips /api/*, and these handlers only checked that
 * *someone* was logged in - so any resident could list every tenant's full user
 * row (password_hash, IC) through GET, and create or cancel on anyone's behalf
 * through POST/PUT. No screen calls them: the resident portal uses server
 * actions, which scope to the session user. Found in the resident portal review.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const tickets = await listTickets();
    return NextResponse.json(tickets);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch tickets";
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
    const ticket = await raiseTicket({
      unit_id: String(body.unit_id),
      requester_id: user.userId,
      title: String(body.title),
      description: String(body.description),
      ticket_category: String(body.ticket_category ?? "Maintenance"),
      priority: String(body.priority ?? "Medium"),
      createdBy: user.userId,
    });
    return NextResponse.json(ticket, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to raise ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const body = await request.json();
    if (!body.ticket_id || !body.status) {
      throw new Error("Ticket ID and status are required");
    }
    await updateTicketStatus(body.ticket_id, body.status, user.userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
