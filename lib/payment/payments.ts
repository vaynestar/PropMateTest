import prisma from "@/lib/prisma";
import { FILE_TOO_LARGE_MESSAGE } from "@/lib/upload-limit";
import { createBill, getBillPayment, getToyyibPayConfig } from "./toyyibpay";
import { IMAGE_OR_PDF, removeFile, sniffFileType, storeFile, typeMessage } from "@/lib/storage/files";
import { getStorageFolder } from "@/lib/storage/folders";
import { firebaseStorageConfigured } from "@/lib/storage/firebase";
import { isUuid } from "@/lib/uuid";

/**
 * Invoice payments.
 *
 * The live path (user, 2026-09-15): *"let the resident submit their payment as
 * evidence, then admin will need to verify it, if confirmed then mark as paid"*.
 *   1. Resident pays by bank transfer outside PropMate.
 *   2. Resident submits evidence here: receipt (image or PDF), reference, date paid.
 *   3. The office reviews it: Approve marks the invoice Paid; Reject records a
 *      reason the resident sees, and they can submit again.
 *
 * The ToyyibPay gateway (DEV-174) stays in the code but is off unless
 * PAYMENT_GATEWAY_ENABLED=true *and* its keys are set - adding sandbox keys
 * alone must not surface it.
 *
 * An invoice becomes Paid in exactly three places, none of them a browser's
 * word: an admin approving evidence, an admin marking it Paid, or ToyyibPay's
 * own answer about a bill.
 */

export const GATEWAY_METHOD = "ToyyibPay FPX";
export const MANUAL_METHOD = "Bank transfer";

export const PROOF_MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB

export function onlinePaymentsEnabled() {
  return process.env.PAYMENT_GATEWAY_ENABLED === "true" && getToyyibPayConfig() !== null;
}

export function onlinePaymentsAreSandbox() {
  return getToyyibPayConfig()?.isSandbox ?? false;
}

export { isUuid };

/** Today in Malaysia as YYYY-MM-DD. */
export function todayMY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

/** A YYYY-MM-DD calendar day as a @db.Date (UTC midnight of that day). */
function dbDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * The file's real type, from its first bytes. The browser-supplied MIME type
 * and filename are both just text the uploader chose, so neither is trusted -
 * an HTML or SVG file renamed receipt.png would otherwise be served back to an
 * admin's browser.
 */
export function sniffProofType(bytes: Uint8Array): string | null {
  return sniffFileType(bytes);
}

/** An issued invoice on the resident's own lease, or null. */
export async function findResidentInvoice(invoiceId: string, userId: string) {
  if (!isUuid(invoiceId)) return null;
  return prisma.invoice.findFirst({
    where: { invoice_id: invoiceId, issued_at: { not: null }, lease: { user_id: userId } },
    include: { lease: { include: { unit: true, tenant: true } } },
  });
}

/** Never selects the file itself - listings must not pull megabytes per row. */
export const SUBMISSION_FIELDS = {
  transaction_id: true,
  invoice_id: true,
  payment_method: true,
  reference_number: true,
  payment_date: true,
  transaction_amount: true,
  transaction_status: true,
  proof_mime: true,
  proof_filename: true,
  proof_size: true,
  review_note: true,
  reviewed_at: true,
  created_at: true,
} as const;

// ---------------------------------------------------------------- evidence

const ALREADY_SENT = "You've already sent proof for this invoice. The office is checking it.";

export async function submitPaymentEvidence(input: {
  invoiceId: string;
  userId: string;
  reference: string;
  paidOn: string;
  file: { bytes: Uint8Array; name: string; size: number } | null;
}) {
  const invoice = await findResidentInvoice(input.invoiceId, input.userId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "Unpaid") throw new Error("This invoice isn't waiting for payment.");

  const waiting = await prisma.paymentTransaction.findFirst({
    where: { invoice_id: invoice.invoice_id, payment_method: MANUAL_METHOD, transaction_status: "Pending" },
    select: { transaction_id: true },
  });
  if (waiting) throw new Error(ALREADY_SENT);

  const reference = input.reference.trim();
  if (reference.length < 4 || reference.length > 60) {
    throw new Error("Enter the transfer reference from your bank (4 to 60 characters).");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn) || input.paidOn > todayMY()) {
    throw new Error("Enter the date you paid - today or earlier.");
  }

  /*
   * The receipt is OPTIONAL (user, 2026-11-20). Residents on iPhones were
   * blocked by an upload that failed before the bytes ever reached us, and the
   * transfer reference is what the office matches against the bank statement
   * anyway - the image is corroboration, not the evidence itself. A proof with
   * no file is still a Pending submission the office must review.
   *
   * When a file IS sent, every rule below is exactly as it was.
   */
  const file = input.file && input.file.size > 0 ? input.file : null;
  let mime: string | null = null;
  let safeName: string | null = null;
  if (file) {
    if (file.size > PROOF_MAX_BYTES) throw new Error(FILE_TOO_LARGE_MESSAGE);
    mime = sniffProofType(file.bytes);
    if (!mime) throw new Error(typeMessage(IMAGE_OR_PDF));
    safeName = (file.name || "receipt").replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  }

  /*
   * Receipts go to Firebase Storage. Without Firebase configured (a local
   * checkout with no FIREBASE_* variables) they fall back to the database, so
   * development still works.
   */
  let proofPath: string | null = null;
  if (file && firebaseStorageConfigured()) {
    proofPath = (
      await storeFile({
        folder: await getStorageFolder("payment_receipt"),
        bytes: file.bytes,
        allowed: IMAGE_OR_PDF,
        label: `${invoice.invoice_no}-${invoice.lease.unit.unit_number}`,
      })
    ).path;
  }

  try {
    /*
     * The "already sent proof" check above is a read, and a read cannot stop a
     * race (QC case C03). Two taps on Send a moment apart both found the
     * invoice clear and both wrote a receipt, so the office saw the same
     * payment twice and could approve it twice.
     *
     * Check and insert now run in one transaction, behind a lock on this
     * invoice: the second tap waits, re-reads, and is told the office already
     * has the first one. The lock is per invoice, so two residents paying
     * different bills never wait for each other - which is what SERIALIZABLE
     * would have cost us (see the adjacent-slot case in booking-management.ts).
     */
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`proof:${invoice.invoice_id}`}))`;
        const clash = await tx.paymentTransaction.findFirst({
          where: { invoice_id: invoice.invoice_id, payment_method: MANUAL_METHOD, transaction_status: "Pending" },
          select: { transaction_id: true },
        });
        if (clash) throw new Error(ALREADY_SENT);
        return tx.paymentTransaction.create({
          data: {
            invoice_id: invoice.invoice_id,
            transaction_type: "Payment",
            payment_date: dbDate(input.paidOn),
            transaction_amount: invoice.total_amount,
            payment_method: MANUAL_METHOD,
            reference_number: reference,
            transaction_status: "Pending",
            proof_path: proofPath,
            proof_data: file && !proofPath ? Buffer.from(file.bytes) : null,
            proof_mime: mime,
            proof_filename: safeName,
            proof_size: file ? file.size : null,
            created_by: input.userId,
          },
          select: { transaction_id: true },
        });
      },
      { timeout: 15000 }
    );
  } catch (error) {
    // No row to point at it - don't leave an orphan file in the bucket.
    await removeFile(proofPath).catch(() => {});
    throw error;
  }
}

export async function reviewPaymentEvidence(input: {
  transactionId: string;
  adminId: string;
  decision: "approve" | "reject";
  note: string;
}) {
  if (!isUuid(input.transactionId)) throw new Error("Payment not found.");
  const tx = await prisma.paymentTransaction.findUnique({
    where: { transaction_id: input.transactionId },
    select: {
      transaction_id: true,
      invoice_id: true,
      payment_method: true,
      transaction_status: true,
      invoice: { select: { invoice_no: true, status: true } },
    },
  });
  if (!tx || tx.payment_method !== MANUAL_METHOD) throw new Error("Payment not found.");
  if (tx.transaction_status !== "Pending") throw new Error("This payment has already been reviewed.");

  const note = input.note.trim();
  const now = new Date();

  if (input.decision === "reject") {
    if (note.length < 5) throw new Error("Tell the resident why it wasn't accepted (at least 5 characters).");
    await prisma.paymentTransaction.update({
      where: { transaction_id: tx.transaction_id },
      data: {
        transaction_status: "Rejected",
        reviewed_by: input.adminId,
        reviewed_at: now,
        review_note: note.slice(0, 500),
        modified_by: input.adminId,
      },
    });
    return { invoiceNo: tx.invoice.invoice_no, invoiceId: tx.invoice_id, decision: "reject" as const };
  }

  if (tx.invoice.status !== "Unpaid") {
    throw new Error(`${tx.invoice.invoice_no} is ${tx.invoice.status}, not Unpaid. Check it before approving.`);
  }

  await prisma.$transaction([
    prisma.paymentTransaction.update({
      where: { transaction_id: tx.transaction_id },
      data: {
        transaction_status: "Success",
        reviewed_by: input.adminId,
        reviewed_at: now,
        review_note: note ? note.slice(0, 500) : null,
        modified_by: input.adminId,
      },
    }),
    prisma.invoice.updateMany({
      where: { invoice_id: tx.invoice_id, status: "Unpaid" },
      data: { status: "Paid", modified_by: input.adminId },
    }),
  ]);
  return { invoiceNo: tx.invoice.invoice_no, invoiceId: tx.invoice_id, decision: "approve" as const };
}

// ---------------------------------------------------------------- gateway (off by default)

export async function startGatewayPayment(input: {
  invoiceId: string;
  userId: string;
  baseUrl: string;
}): Promise<string> {
  const config = getToyyibPayConfig();
  if (!onlinePaymentsEnabled() || !config) {
    throw new Error("Online payment isn't available. Please pay by bank transfer and send your proof.");
  }

  const invoice = await findResidentInvoice(input.invoiceId, input.userId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "Unpaid") throw new Error("This invoice isn't waiting for payment.");

  const bill = await createBill(config, {
    invoiceNo: invoice.invoice_no,
    description: `Unit ${invoice.lease.unit.unit_number} invoice ${invoice.invoice_no}`,
    amountRinggit: Number(invoice.total_amount),
    payerName: invoice.lease.tenant.user_name,
    payerEmail: invoice.lease.tenant.user_email,
    payerPhone: invoice.lease.tenant.phone_number ?? "",
    returnUrl: `${input.baseUrl}/api/payments/toyyibpay/return`,
    callbackUrl: `${input.baseUrl}/api/payments/toyyibpay/callback`,
  });

  await prisma.paymentTransaction.create({
    data: {
      invoice_id: invoice.invoice_id,
      transaction_type: "Payment",
      payment_date: dbDate(todayMY()),
      transaction_amount: invoice.total_amount,
      payment_method: GATEWAY_METHOD,
      reference_number: bill.billCode,
      transaction_status: "Pending",
      created_by: input.userId,
    },
  });

  return bill.paymentUrl;
}

export type GatewayOutcome = "paid" | "pending" | "failed" | "mismatch" | "unknown";

/** Settles a ToyyibPay bill by asking ToyyibPay - see DEV-174. Idempotent. */
export async function confirmGatewayPayment(
  billCode: string
): Promise<{ invoiceId: string | null; outcome: GatewayOutcome }> {
  const config = getToyyibPayConfig();
  const code = billCode.trim();
  if (!config || !code) return { invoiceId: null, outcome: "unknown" };

  const tx = await prisma.paymentTransaction.findFirst({
    where: { reference_number: code, payment_method: GATEWAY_METHOD },
    select: { transaction_id: true, invoice_id: true, transaction_status: true, transaction_amount: true },
  });
  if (!tx) return { invoiceId: null, outcome: "unknown" };
  if (tx.transaction_status === "Success") return { invoiceId: tx.invoice_id, outcome: "paid" };

  const result = await getBillPayment(config, code);

  if (result.paid) {
    const expectedCents = Math.round(Number(tx.transaction_amount) * 100);
    if (result.amountCents !== null && result.amountCents !== expectedCents) {
      await prisma.paymentTransaction.update({
        where: { transaction_id: tx.transaction_id },
        data: { transaction_status: "Amount mismatch" },
      });
      return { invoiceId: tx.invoice_id, outcome: "mismatch" };
    }
    await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { transaction_id: tx.transaction_id },
        data: { transaction_status: "Success", payment_date: dbDate(todayMY()) },
      }),
      prisma.invoice.updateMany({
        where: { invoice_id: tx.invoice_id, status: "Unpaid" },
        data: { status: "Paid" },
      }),
    ]);
    return { invoiceId: tx.invoice_id, outcome: "paid" };
  }

  if (result.status === "failed") {
    await prisma.paymentTransaction.update({
      where: { transaction_id: tx.transaction_id },
      data: { transaction_status: "Failed" },
    });
    return { invoiceId: tx.invoice_id, outcome: "failed" };
  }

  return { invoiceId: tx.invoice_id, outcome: "pending" };
}
