"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { startGatewayPayment, submitManualPayment } from "@/lib/payment/payments";

export type PaymentActionState = { error?: string; success?: string } | null;

/** The origin ToyyibPay should send the resident and its callback back to. */
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
    return {
      error: error instanceof Error ? error.message : "Couldn't start the payment. Please try again.",
    };
  }
  // Outside the try: redirect() works by throwing.
  redirect(paymentUrl);
}

export async function submitManualPaymentAction(
  invoiceId: string,
  _prev: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  const user = await requireUser(["Resident"]);
  try {
    await submitManualPayment({
      invoiceId,
      userId: user.userId,
      reference: String(formData.get("reference") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't send that. Please try again." };
  }
  revalidatePath(`/resident/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  return { success: "Thanks - the management office will confirm your payment." };
}
