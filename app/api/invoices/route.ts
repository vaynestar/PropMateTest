import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  generateMonthlyInvoices,
  listInvoices,
  markInvoicePaid,
} from "@/lib/billing";

export async function GET() {
  try {
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
    const result = await generateMonthlyInvoices(user?.userId);
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
    const body = await request.json();
    if (!body.invoice_id) throw new Error("Invoice ID is required");
    await markInvoicePaid(body.invoice_id, user?.userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
