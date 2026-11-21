import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getResidentInvoiceDetail } from "@/lib/invoice-detail";
import InvoiceDetailBody from "@/components/billing/InvoiceDetailBody";

export const dynamic = "force-dynamic";

/**
 * One invoice as its own page.
 *
 * Since DEV-242 the bill list opens this in a dialog instead of navigating,
 * so most residents never arrive here. It stays for the places that link
 * straight to a bill - a notification, a bookmark, a shared link - and
 * renders the very same body the dialog does.
 */
export default async function ResidentInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireUser(["Resident"]);
  const { id } = await params;
  await searchParams;

  const detail = await getResidentInvoiceDetail(id, user.userId);
  if (!detail) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-stack-lg">
      <Link href="/resident/invoices" className="text-xs font-semibold text-primary hover:underline">
        ← All bills
      </Link>
      <InvoiceDetailBody detail={detail} />
    </div>
  );
}
