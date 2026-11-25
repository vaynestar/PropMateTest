import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllLeases } from "@/lib/lease-management";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import LeasesClient from "@/components/leases/LeasesClient";
import SetupFlow from "@/components/layout/SetupFlow";
import { getSetupProgress } from "@/lib/setup-progress";
import { getActivePropertyId } from "@/lib/property-context.server";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminLeasesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const searchParams = await props.searchParams;
  const urlPropertyId = searchParams.property as string | undefined;
  const urlTenantId = searchParams.tenant as string | undefined;
  const urlUnitNumber = searchParams.unit as string | undefined;
  const cookiePropertyId = cookieStore.get("propmate_property_id")?.value;

  const properties = await listPropertiesForUnits();
  // Filtering by tenant deliberately spans every property, so that view stays
  // unscoped. Otherwise use the shared universal-property resolution.
  const activePropertyId = urlTenantId
    ? null
    : await getActivePropertyId(urlPropertyId);

  const [leases, units, users] = await Promise.all([
    getAllLeases(
      activePropertyId || undefined,
      urlTenantId,
      undefined,
      true, // fetch all so client can filter seamlessly
      urlUnitNumber
    ),
    listUnits(activePropertyId || undefined),
    /*
     * The residents this property could sensibly lease to (DEV-287).
     *
     * This asked for every resident in the database, while `listUnits` beside
     * it was scoped — so on a 12-unit building the picker offered all 36
     * people, 30 of them tenants of another property entirely. User:
     * "tenancy > choose resident should based on current property not from
     * all property". It is also the surface where DEV-279's wrong-tenant bug
     * happened, and a shorter list is a smaller target.
     *
     * Two groups qualify, not one:
     *   · anyone who already holds a tenancy here, past or present — a
     *     renewal or a second unit;
     *   · anyone with no tenancy anywhere, because a resident is tied to a
     *     property only THROUGH a tenancy. Scoping on the property alone
     *     would hide the person you just registered, which is precisely who
     *     you came here to lease to.
     *
     * Only residents who belong solely to other properties are dropped.
     */
    prisma.user.findMany({
      where: {
        role: "Resident",
        ...(activePropertyId
          ? {
              OR: [
                { tenant_leases: { some: { unit: { property_id: activePropertyId } } } },
                { tenant_leases: { none: {} } },
              ],
            }
          : {}),
      },
      select: { user_id: true, user_name: true, user_email: true },
      orderBy: { user_name: "asc" },
    }),
  ]);

  /*
   * What each tenancy actually bills, and what it is still owed (DEV-265).
   *
   * A tenancy with no recurring charges is the most expensive silent failure
   * in the product: the monthly run skips it, the money never appears, and
   * nobody learns until somebody audits the arrears. The list could not show
   * it because it never knew the amounts — only `_count.lease_charges`,
   * which a charge of RM 0.00 satisfies just as well as a real one.
   */
  const leaseIds = leases.map((l: any) => l.lease_id);
  const [charges, unpaidInvoices] = await Promise.all([
    leaseIds.length
      ? prisma.leaseCharge.findMany({
          where: { lease_id: { in: leaseIds }, is_active: true },
          select: {
            lease_id: true,
            amount: true,
            quantity: true,
            charge: { select: { charge_name: true } },
          },
        })
      : [],
    leaseIds.length
      ? prisma.invoice.findMany({
          where: { lease_id: { in: leaseIds }, status: { notIn: ["Paid", "Inactive"] } },
          select: { lease_id: true, total_amount: true },
        })
      : [],
  ]);

  const billedByLease: Record<string, number> = {};
  const chargeNamesByLease: Record<string, string[]> = {};
  for (const c of charges) {
    // Rule 6: amount and quantity are both Decimal.
    billedByLease[c.lease_id] =
      (billedByLease[c.lease_id] ?? 0) + Number(c.amount ?? 0) * Number(c.quantity ?? 1);
    (chargeNamesByLease[c.lease_id] ??= []).push(c.charge?.charge_name ?? "Charge");
  }

  const owedByLease: Record<string, number> = {};
  for (const inv of unpaidInvoices) {
    if (!inv.lease_id) continue;
    owedByLease[inv.lease_id] = (owedByLease[inv.lease_id] ?? 0) + Number(inv.total_amount ?? 0);
  }

  // A lease with no charges falls back to the unit's own monthly rent, which
  // is what the invoice generator does — so the figure here and the figure it
  // would bill cannot disagree.
  const rentByUnit: Record<string, number> = {};
  for (const u of units) rentByUnit[u.unit_id] = Number(u.monthly_rent ?? 0);

  // The setup chain, through to the first invoices (see lib/setup-progress).
  const activeProperty = properties.find((p) => p.property_id === activePropertyId) ?? null;
  const setupCounts = await getSetupProgress(activePropertyId);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Tenancies"
        subtitle="A tenancy joins a resident to a unit, and it is what gets billed. No tenancy, no invoice."
      />

      {/* Interactive Leases Workspace */}
      {/* Not on a tenant-filtered view: that spans every property, so the
          counts would be portfolio-wide under a heading that says "this property". */}
      {!urlTenantId && (
        <SetupFlow counts={setupCounts} propertyName={activeProperty?.property_name ?? null} />
      )}

      <LeasesClient
        // Same reason as availableUnits below: lease.unit carried the whole
        // Prisma row through the `as any`, Decimals and all.
        initialLeases={leases.map((l: any) => ({
          _count: l._count,
          lease_id: l.lease_id,
          unit_id: l.unit_id,
          user_id: l.user_id,
          move_in_date: l.move_in_date,
          move_out_date: l.move_out_date,
          status: l.status,
          unit: {
            unit_id: l.unit.unit_id,
            unit_number: l.unit.unit_number,
            unit_type: l.unit.unit_type,
            property_id: l.unit.property_id,
            property: l.unit.property
              ? {
                  property_id: l.unit.property.property_id,
                  property_name: l.unit.property.property_name,
                }
              : undefined,
          },
          tenant: {
            user_id: l.tenant.user_id,
            user_name: l.tenant.user_name,
            user_email: l.tenant.user_email,
            phone_number: l.tenant.phone_number,
          },
          billedMonthly: billedByLease[l.lease_id] ?? rentByUnit[l.unit_id] ?? 0,
          chargeNames: chargeNamesByLease[l.lease_id] ?? [],
          owed: owedByLease[l.lease_id] ?? 0,
        }))}
        properties={properties}
        // Only the four fields the client actually declares. The `as any` cast
        // used to hand it the whole Prisma row, Decimal monthly_rent and
        // area_sqft included - which React refuses to serialise (Rule 6).
        availableUnits={units.map((u) => ({
          unit_id: u.unit_id,
          unit_number: u.unit_number,
          status: u.status,
          property: u.property ? { property_name: u.property.property_name } : undefined,
        }))}
        users={users}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
