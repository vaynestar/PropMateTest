import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import ChargeTable from "./ChargeTable";
import AddChargeForm from "./AddChargeForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ChargesPage() {
  await requireUser(["Admin"]);

  const rows = await prisma.chargeMaster.findMany({
    orderBy: { charge_name: "asc" },
    include: {
      /*
       * How many leases bill this, and whether it has ever reached an
       * invoice (DEV-258). A charge nobody uses and a charge on every lease
       * looked identical on this screen, and retiring the second one is a
       * very different act from retiring the first.
       */
      _count: { select: { lease_charges: true, invoice_details: true } },
    },
  });

  // Prisma Decimal cannot cross into a Client Component — AGENTS.md Rule 6.
  // default_amount was reaching ChargeTable raw, logging 15 console errors.
  const charges = rows.map((c) => ({
    charge_id: c.charge_id,
    charge_name: c.charge_name,
    charge_type: c.charge_type,
    uom: c.uom,
    default_amount: Number(c.default_amount ?? 0),
    description: c.description,
    is_active: c.is_active,
    leaseCount: c._count.lease_charges,
    invoicedCount: c._count.invoice_details,
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/admin/billing"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Billing
      </Link>

      <PageHeader
        title="Charge types"
        subtitle="The catalogue every invoice line comes from. Change one here and it applies to the next run, never to an invoice already raised."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChargeTable charges={charges} />
        <AddChargeForm />
      </div>
    </div>
  );
}
