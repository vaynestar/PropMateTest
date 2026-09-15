import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isUuid } from "@/lib/payment/payments";

/**
 * Serves one piece of payment evidence.
 *
 * Admin: any. Resident: only evidence for an invoice on their own lease.
 * Anything else is a 404, so an id never confirms that a receipt exists.
 *
 * The stored type came from sniffing the file's bytes at upload (only JPEG,
 * PNG, WEBP, PDF are accepted), and the response adds nosniff and a sandboxing
 * CSP, so a receipt can never run as a page in the admin's browser.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Not found", { status: 404 });
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const tx = await prisma.paymentTransaction.findUnique({
    where: { transaction_id: id },
    select: {
      proof_data: true,
      proof_mime: true,
      proof_filename: true,
      invoice: { select: { lease: { select: { user_id: true } } } },
    },
  });

  const allowed = tx && (user.role === "Admin" || tx.invoice.lease.user_id === user.userId);
  if (!tx || !allowed || !tx.proof_data || !tx.proof_mime) {
    return new NextResponse("Not found", { status: 404 });
  }

  const name = (tx.proof_filename ?? "receipt").replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(tx.proof_data), {
    headers: {
      "Content-Type": tx.proof_mime,
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
