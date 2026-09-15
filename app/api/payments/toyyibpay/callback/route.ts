import { NextRequest, NextResponse } from "next/server";
import { confirmGatewayPayment } from "@/lib/payment/payments";

/**
 * ToyyibPay server-to-server callback (billCallbackUrl).
 *
 * Deliberately needs no session - ToyyibPay calls it, not a browser. It is
 * also deliberately not trusted: the POST is unsigned, so all it contributes
 * is a bill code. confirmGatewayPayment() asks ToyyibPay for that bill's real
 * status with our secret key and only then touches the invoice. A forged
 * callback can at most trigger that check.
 */
export async function POST(req: NextRequest) {
  let billCode = "";
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      billCode = String(body.billcode ?? body.billCode ?? "");
    } else {
      const form = await req.formData();
      billCode = String(form.get("billcode") ?? form.get("billCode") ?? "");
    }
  } catch {
    return NextResponse.json({ error: "Unreadable callback" }, { status: 400 });
  }

  if (!billCode) return NextResponse.json({ error: "Missing billcode" }, { status: 400 });

  try {
    const { outcome } = await confirmGatewayPayment(billCode);
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("ToyyibPay callback failed", error);
    // 500 so ToyyibPay retries; the return redirect will also re-check.
    return NextResponse.json({ error: "Could not confirm payment" }, { status: 500 });
  }
}
