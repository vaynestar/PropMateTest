import prisma from "@/lib/prisma";
import { leaseBillableAmount } from "@/lib/billing";
import type { SetupCounts } from "@/components/layout/SetupFlow";

/**
 * Where a property is in the chain that ends with money arriving:
 * property -> units -> tenants -> lease -> charges -> first invoices.
 *
 * The banner used to stop at "create a lease", but a lease on its own bills
 * nothing. Recurring charges come next and they are the step nobody guesses -
 * and a lease without them is exactly what an invoice run skipped silently
 * before DEV-163.
 */
export async function getSetupProgress(propertyId?: string | null): Promise<SetupCounts> {
  const inProperty = propertyId ? { property_id: propertyId } : {};

  /*
   * Every count is scoped to the property, because the panel this feeds is
   * headed "Every step done for this property" (DEV-283).
   *
   * Two of them were not. `properties` counted every building the office
   * manages and `tenants` counted every resident in the database, so a brand
   * new property with one resident reported "Property created 6" and
   * "Residents registered 35" — numbers that belong to no property and
   * contradict the panel they sit in. A resident is tied to a property only
   * through a tenancy, so that is what is counted here, which also matches
   * what the Residents page shows once you click the step.
   */
  const [properties, units, tenants, activeLeases, invoices] = await Promise.all([
    prisma.propertyMaster.count({ where: propertyId ? { property_id: propertyId } : {} }),
    prisma.unit.count({ where: inProperty }),
    prisma.user.count({
      where: {
        role: "Resident",
        ...(propertyId ? { tenant_leases: { some: { unit: inProperty } } } : {}),
      },
    }),
    prisma.tenantLease.findMany({
      where: { status: "Active", unit: inProperty },
      select: {
        unit: { select: { monthly_rent: true } },
        lease_charges: { where: { is_active: true }, select: { amount: true, quantity: true } },
      },
    }),
    prisma.invoice.count({ where: { lease: { unit: inProperty } } }),
  ]);

  return {
    properties,
    units,
    tenants,
    leases: activeLeases.length,
    unbillableLeases: activeLeases.filter((l) => leaseBillableAmount(l) <= 0).length,
    invoices,
  };
}
