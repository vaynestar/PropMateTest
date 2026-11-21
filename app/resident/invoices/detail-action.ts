"use server";

import { getSessionUser } from "@/lib/auth";
import { getResidentInvoiceDetail, type InvoiceDetail } from "@/lib/invoice-detail";

/**
 * The bill behind the dialog the list opens (DEV-242).
 *
 * proxy.ts excludes /api/*, and a server action is no different: this checks
 * the session itself and getResidentInvoiceDetail scopes the query to the
 * caller's own leases, so an invoice id belonging to someone else comes back
 * as "not found" rather than as a bill.
 */
export async function residentInvoiceDetail(
  invoiceId: string
): Promise<{ detail?: InvoiceDetail; error?: string }> {
  const user = await getSessionUser();
  if (!user || user.role !== "Resident") return { error: "Please sign in again." };

  const detail = await getResidentInvoiceDetail(String(invoiceId || ""), user.userId);
  // One message for "no such bill" and "not yours" - the difference is itself
  // information about somebody else's account.
  if (!detail) return { error: "That bill is no longer available." };
  return { detail };
}
