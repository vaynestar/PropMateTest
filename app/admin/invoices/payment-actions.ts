"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { reviewPaymentEvidence } from "@/lib/payment/payments";

export async function reviewPaymentAction(
  transactionId: string,
  decision: "approve" | "reject",
  note: string
): Promise<{ success: true; message: string } | { error: string }> {
  const user = await requireUser(["Admin"]);
  try {
    const res = await reviewPaymentEvidence({ transactionId, adminId: user.userId, decision, note });
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/billing");
    revalidatePath(`/resident/invoices/${res.invoiceId}`);
    return {
      success: true,
      message:
        res.decision === "approve"
          ? `${res.invoiceNo} marked Paid. The resident will see it confirmed.`
          : `Payment for ${res.invoiceNo} not accepted. The resident will see your reason.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't save the review." };
  }
}
