import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/lib/billing";
import GenerateInvoicesButton from "@/components/billing/GenerateInvoicesButton";
import ManualInvoiceButton from "@/components/billing/ManualInvoiceButton";
import InvoiceBatchList from "@/components/billing/InvoiceBatchList";

import prisma from "@/lib/prisma";

import RefreshDataButton from "@/components/billing/RefreshDataButton";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function InvoicesDetailPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? undefined;

  let invoices = await listInvoices(propertyId);
  const chargeMasters = await prisma.chargeMaster.findMany({
    where: { is_active: true },
    orderBy: { charge_name: "asc" }
  });

  if (searchParams.status && searchParams.status !== "All") {
    invoices = invoices.filter(inv => inv.status === searchParams.status);
  }

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/billing"
            className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
          >
            ← Back to Billing
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2">
            Billing Details
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Itemised view of every generated invoice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshDataButton />
          <ManualInvoiceButton />
          <GenerateInvoicesButton />
        </div>
      </div>

      <InvoiceBatchList invoices={invoices} chargeMasters={chargeMasters} />
    </div>
  );
}
