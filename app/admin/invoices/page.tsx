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
  // A Promise in Next 16. It was typed as a plain object, so `status` read as
  // undefined on every request and the filter never applied.
  searchParams: Promise<{ status?: string; lease?: string }>;
}) {
  await requireUser(["Admin"]);
  const { status, lease: leaseId } = await searchParams;
  const propertyId = (await getActivePropertyId()) ?? undefined;

  /*
   * `?lease=` is how the rest of the app reaches one tenancy's invoices - from
   * the lease's billing page, an overdue row on Billing, or the unit on an
   * invoice row. There was no such route: every "see their invoices" link
   * opened the full list and left you to search for the name.
   *
   * It deliberately ignores the active property. The link names a lease; if the
   * top bar is on a different building, hiding that lease's invoices would make
   * a correct link look broken.
   */
  let invoices = await listInvoices(leaseId ? undefined : propertyId);
  const leaseFocus = leaseId
    ? invoices.find((inv) => inv.lease_id === leaseId)?.lease ?? null
    : null;
  if (leaseId) invoices = invoices.filter((inv) => inv.lease_id === leaseId);
  const chargeMasters = await prisma.chargeMaster.findMany({
    where: { is_active: true },
    orderBy: { charge_name: "asc" }
  });

  if (status && status !== "All") {
    invoices = invoices.filter((inv) => inv.status === status);
  }

  // Prisma Decimal on invoice totals, line items and charge defaults cannot be
  // handed to a Client Component — AGENTS.md Rule 6. Fourth place this has bitten
  // (Units, Tenants, recurring charges, here).
  const serialisedInvoices = (invoices as any[]).map((inv) => ({
    ...inv,
    total_amount: Number(inv.total_amount ?? 0),
    lease: inv.lease
      ? {
          ...inv.lease,
          unit: inv.lease.unit
            ? {
                ...inv.lease.unit,
                area_sqft: Number(inv.lease.unit.area_sqft ?? 0),
                monthly_rent: Number(inv.lease.unit.monthly_rent ?? 0),
              }
            : inv.lease.unit,
        }
      : inv.lease,
    details: (inv.details ?? []).map((d: any) => ({
      ...d,
      unit_price: Number(d.unit_price ?? 0),
      quantity: Number(d.quantity ?? 0),
      total_price: Number(d.total_price ?? 0),
      charge: d.charge
        ? { ...d.charge, default_amount: Number(d.charge.default_amount ?? 0) }
        : d.charge,
    })),
  }));

  const serialisedCharges = (chargeMasters as any[]).map((c) => ({
    ...c,
    default_amount: Number(c.default_amount ?? 0),
  }));

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
            Invoices
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Every invoice raised, newest batch first.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshDataButton />
          <ManualInvoiceButton />
          <GenerateInvoicesButton />
        </div>
      </div>

      {leaseId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3">
          <p className="text-sm text-on-surface">
            {leaseFocus ? (
              <>
                Invoices for <span className="font-semibold text-white">Unit {leaseFocus.unit?.unit_number}</span>
                {" · "}
                <Link
                  href={`/admin/leases?tenant=${leaseFocus.user_id}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {leaseFocus.tenant?.user_name}
                </Link>
                <span className="text-on-surface-variant"> — {invoices.length} on record</span>
              </>
            ) : (
              <span className="text-on-surface-variant">This lease has no invoices yet.</span>
            )}
          </p>
          <Link href="/admin/invoices" className="text-xs font-semibold text-primary hover:underline">
            Show all invoices
          </Link>
        </div>
      )}

      <InvoiceBatchList invoices={serialisedInvoices as any} chargeMasters={serialisedCharges as any} />
    </div>
  );
}
