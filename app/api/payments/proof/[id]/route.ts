import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isUuid } from "@/lib/payment/payments";
import { getObject } from "@/lib/storage/firebase";

/**
 * Serves one piece of payment evidence.
 *
 * Admin: any. Resident: only evidence for an invoice on their own lease.
 * Anything else is a 404, so an id never confirms that a receipt exists.
 *
 * The file is in Firebase Storage (proof_path); older rows kept the bytes in
 * the database (proof_data) and are still served from there. The stored type
 * was sniffed from the bytes at upload, and the response adds nosniff and a
 * sandboxing CSP, so a receipt can never run as a page in the admin's browser.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const tx = await prisma.paymentTransaction.findUnique({
    where: { transaction_id: id },
    select: {
      proof_path: true,
      proof_data: true,
      proof_mime: true,
      proof_filename: true,
      invoice: { select: { lease: { select: { user_id: true } } } },
    },
  });

  const allowed = tx && (user.role === "Admin" || tx.invoice.lease.user_id === user.userId);
  if (!tx || !allowed || !tx.proof_mime) return new NextResponse("Not found", { status: 404 });

  let bytes: Uint8Array<ArrayBuffer> | null = null;
  if (tx.proof_path) {
    try {
      const obj = await getObject(tx.proof_path);
      bytes = obj ? new Uint8Array(obj.bytes) : null;
    } catch (error) {
      console.error("Receipt read failed", error instanceof Error ? error.message : error);
      return new NextResponse("Unavailable", { status: 503 });
    }
  } else if (tx.proof_data) {
    bytes = new Uint8Array(tx.proof_data);
  }
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  const name = (tx.proof_filename ?? "receipt").replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": tx.proof_mime,
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
