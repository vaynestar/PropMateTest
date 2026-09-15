import { NextRequest, NextResponse } from "next/server";
import { confirmGatewayPayment } from "@/lib/payment/payments";

/**
 * Where ToyyibPay sends the resident's browser after checkout (billReturnUrl).
 *
 * The query string says `status_id=1` for success, but a query string is
 * something anyone can type, so it is ignored. The bill code is re-checked
 * with ToyyibPay, which also settles the payment if the callback hasn't
 * arrived yet - common on a slow sandbox, and always the case on localhost,
 * which ToyyibPay's servers cannot reach.
 */
export async function GET(req: NextRequest) {
  const billCode = req.nextUrl.searchParams.get("billcode") ?? "";

  let invoiceId: string | null = null;
  let outcome = "unknown";
  try {
    ({ invoiceId, outcome } = await confirmGatewayPayment(billCode));
  } catch (error) {
    console.error("ToyyibPay return check failed", error);
    outcome = "pending";
  }

  const target = invoiceId ? `/resident/invoices/${invoiceId}` : "/resident/invoices";
  const url = new URL(target, req.url);
  url.searchParams.set("payment", outcome);
  return NextResponse.redirect(url);
}
