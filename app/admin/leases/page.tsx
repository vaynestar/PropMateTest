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
    prisma.user.findMany({
      where: { role: "Resident" },
      select: { user_id: true, user_name: true, user_email: true },
      orderBy: { user_name: "asc" },
    }),
  ]);

  // The setup chain, through to the first invoices (see lib/setup-progress).
  const activeProperty = properties.find((p) => p.property_id === activePropertyId) ?? null;
  const setupCounts = await getSetupProgress(activePropertyId);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Leases"
        subtitle="A lease links a tenant to a unit and starts their billing. Create one once the unit and the tenant both exist."
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
