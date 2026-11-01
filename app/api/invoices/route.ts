import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  getEligibleLeasesForInvoicing,
  generateInvoicesForLeases,
  listInvoices,
  markInvoicePaid,
} from "@/lib/billing";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const invoices = await listInvoices();
    return NextResponse.json(invoices);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch invoices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    /*
     * The admin screen bills one property at a time (DEV-210). This route has
     * no property context - it is the maintenance path - so it deliberately
     * bills every active tenancy, and says so rather than looking like the
     * same operation as the button.
     */
    const eligible = await getEligibleLeasesForInvoicing();
    const leaseIds = eligible.map(l => l.lease_id);
    const result = await generateInvoicesForLeases(leaseIds, user.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate invoices";
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
    if (!body.invoice_id) throw new Error("Invoice ID is required");
    await markInvoicePaid(body.invoice_id, user.userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
