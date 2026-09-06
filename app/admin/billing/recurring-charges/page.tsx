import { getRecurringChargesData } from "@/app/admin/billing/recurring-charges/actions";
import RecurringChargesClient from "@/components/billing/RecurringChargesClient";
import { getActivePropertyId } from "@/lib/property-context.server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recurring charges - PropMate",
};

export default async function RecurringChargesPage() {
  const activePropertyId = await getActivePropertyId();
  const { leases, chargeMasters, properties } = await getRecurringChargesData(activePropertyId);

  const activeProperty = activePropertyId
    ? await prisma.propertyMaster.findUnique({
        where: { property_id: activePropertyId },
        select: { property_name: true },
      })
    : null;

  // Prisma Decimal on rent and charge amounts cannot cross into a Client
  // Component — AGENTS.md Rule 6.
  const serialisedLeases = leases.map((l: any) => ({
    lease_id: l.lease_id,
    status: l.status,
    tenant: l.tenant
      ? { user_id: l.tenant.user_id, user_name: l.tenant.user_name, user_email: l.tenant.user_email }
      : null,
    unit: l.unit
      ? {
          unit_id: l.unit.unit_id,
          unit_number: l.unit.unit_number,
          property_id: l.unit.property_id,
          monthly_rent: Number(l.unit.monthly_rent ?? 0),
          property: l.unit.property
            ? { property_id: l.unit.property.property_id, property_name: l.unit.property.property_name }
            : null,
        }
      : null,
    lease_charges: (l.lease_charges ?? []).map((c: any) => ({
      lease_charge_id: c.lease_charge_id,
      amount: Number(c.amount ?? 0),
      quantity: Number(c.quantity ?? 1),
      is_active: c.is_active,
      charge: c.charge
        ? {
            charge_id: c.charge.charge_id,
            charge_name: c.charge.charge_name,
            uom: c.charge.uom,
            default_amount: Number(c.charge.default_amount ?? 0),
          }
        : null,
    })),
  }));

  const serialisedChargeMasters = chargeMasters.map((c: any) => ({
    charge_id: c.charge_id,
    charge_name: c.charge_name,
    charge_type: c.charge_type,
    uom: c.uom,
    default_amount: Number(c.default_amount ?? 0),
    is_active: c.is_active,
  }));

  return (
    <div className="w-full">
      <RecurringChargesClient
        leases={serialisedLeases as any}
        chargeMasters={serialisedChargeMasters as any}
        properties={properties as any}
        activePropertyName={activeProperty?.property_name ?? null}
      />
    </div>
  );
}
