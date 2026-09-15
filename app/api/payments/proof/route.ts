import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { PROOF_MAX_BYTES, submitPaymentEvidence } from "@/lib/payment/payments";

/**
 * Resident submits payment evidence for one of their invoices.
 *
 * A route handler rather than a server action: server actions reject bodies
 * over 1 MB by default, and a phone photo of a receipt is routinely 2-3 MB.
 * Every rule - ownership, invoice state, file type by content, size, date -
 * lives in submitPaymentEvidence(); this only unpacks the form.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "Resident") {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > PROOF_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "That file is over 4 MB. Try a screenshot instead." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload. Please try again." }, { status: 400 });
  }

  const invoiceId = String(form.get("invoiceId") ?? "");
  const file = form.get("file");

  try {
    await submitPaymentEvidence({
      invoiceId,
      userId: user.userId,
      reference: String(form.get("reference") ?? ""),
      paidOn: String(form.get("paidOn") ?? ""),
      file:
        file instanceof File
          ? { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, size: file.size }
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't send your proof." },
      { status: 400 }
    );
  }

  revalidatePath(`/resident/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/billing");
  return NextResponse.json({ ok: true });
}
