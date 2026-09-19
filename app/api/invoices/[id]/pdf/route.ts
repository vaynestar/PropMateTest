import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { loadInvoiceDoc } from "@/lib/invoice-document";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

/**
 * Download an invoice as a PDF (DEV-191). Same access rule as the preview:
 * admins any invoice, a resident only an issued invoice on their own lease.
 * Anything else is 404, so the URL doesn't confirm the invoice exists.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("Not found", { status: 404 });

  const doc = await loadInvoiceDoc(id, user);
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const bytes = await renderInvoicePdf(doc);
  const name = `${doc.invoiceNo.replace(/[^A-Za-z0-9._-]/g, "_")}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
