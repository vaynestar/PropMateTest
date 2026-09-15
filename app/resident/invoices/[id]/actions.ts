"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { startGatewayPayment } from "@/lib/payment/payments";

export type PaymentActionState = { error?: string } | null;

/*
 * Payment evidence is submitted through POST /api/payments/proof, not a server
 * action: server actions reject bodies over 1 MB, and receipt photos aren't.
 * Only the (currently disabled) ToyyibPay path remains here.
 */

async function originFromRequest() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (!host) throw new Error("Could not work out this site's address.");
  return `${proto}://${host}`;
}

export async function payOnlineAction(
  invoiceId: string,
  _prev: PaymentActionState,
  _formData: FormData
): Promise<PaymentActionState> {
  const user = await requireUser(["Resident"]);

  let paymentUrl: string;
  try {
    paymentUrl = await startGatewayPayment({
      invoiceId,
      userId: user.userId,
      baseUrl: await originFromRequest(),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't start the payment. Please try again." };
  }
  redirect(paymentUrl);
}
