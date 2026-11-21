"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPaymentReviewContext, reviewPaymentEvidence } from "@/lib/payment/payments";

/** The figures the review dialog needs before it can ask anything (DEV-260). */
export async function getPaymentReviewContextAction(transactionId: string) {
  await requireUser(["Admin"]);
  try {
    return await getPaymentReviewContext(transactionId);
  } catch {
    return null;
  }
}

export async function reviewPaymentAction(
  transactionId: string,
  decision: "approve" | "reject",
  note: string,
  amount?: number
): Promise<{ success: true; message: string } | { error: string }> {
  const user = await requireUser(["Admin"]);
  try {
    const res = await reviewPaymentEvidence({ transactionId, adminId: user.userId, decision, note, amount });
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing");
    revalidatePath(`/resident/invoices/${res.invoiceId}`);

    if (res.decision === "reject") {
      return {
        success: true,
        message: `Payment for ${res.invoiceNo} not accepted. The resident will see your reason.`,
      };
    }

    // A part payment is a different outcome from a settlement and must not be
    // reported as one — the old message said "marked Paid" whatever happened.
    return {
      success: true,
      message: res.settled
        ? `${res.invoiceNo} is settled. The resident sees it confirmed.`
        : `RM ${res.amount.toFixed(2)} recorded against ${res.invoiceNo}. RM ${res.balance.toFixed(
            2
          )} still outstanding.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't save the review." };
  }
}
