"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { startGatewayPayment, withdrawPaymentEvidence } from "@/lib/payment/payments";

export type PaymentActionState = { error?: string } | null;

/** Take back a proof the office has not reviewed yet, and send a new one. */
export async function withdrawProofAction(invoiceId: string, transactionId: string) {
  const user = await requireUser(["Resident"]);
  try {
    await withdrawPaymentEvidence({ transactionId, userId: user.userId });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't take that back. Please try again." };
  }
  revalidatePath(`/resident/invoices/${invoiceId}`);
  revalidatePath("/resident/invoices");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");
  return {};
}

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
