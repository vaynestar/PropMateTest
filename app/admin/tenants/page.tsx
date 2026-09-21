import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import TenantsClient from "@/components/tenants/TenantsClient";
import { getActivePropertyId } from "@/lib/property-context.server";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireUser(["Admin"]);

  const [tenants, properties] = await Promise.all([
    prisma.user.findMany({
      where: { role: "Resident" },
      orderBy: { created_at: "desc" },
      include: {
        tenant_leases: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    }),
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true },
      orderBy: { property_name: "asc" },
    }),
  ]);

  // A resident can hold tenancies in more than one property, so this list stays
  // global — but it opens on whichever property the top bar is working in.
  const activePropertyId = await getActivePropertyId();

  // Prisma returns Decimal on the nested unit (area_sqft, monthly_rent).
  // Passing those raw into a Client Component logged "Only plain objects can be
  // passed to Client Components" for every tenant on every render. AGENTS.md Rule 6.
  const serialisedTenants = tenants.map((u) => ({
    user_id: u.user_id,
    user_name: u.user_name,
    user_email: u.user_email,
    phone_number: u.phone_number ?? null,
    role: u.role,
    is_active: u.is_active,
    tenant_leases: (u.tenant_leases ?? []).map((l: any) => ({
      lease_id: l.lease_id,
      status: l.status,
      move_in_date: l.move_in_date ? l.move_in_date.toISOString() : null,
      move_out_date: l.move_out_date ? l.move_out_date.toISOString() : null,
      unit: l.unit
        ? {
            unit_id: l.unit.unit_id,
            unit_number: l.unit.unit_number,
            property_id: l.unit.property_id,
            property: l.unit.property
              ? {
                  property_id: l.unit.property.property_id,
                  property_name: l.unit.property.property_name,
                }
              : undefined,
          }
        : undefined,
    })),
  }));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Tenants"
        subtitle="The people who live here. Add a tenant first, then give them a unit by creating a lease."
      />

      {/* Interactive Tenants Workspace */}
      <TenantsClient
        initialTenants={serialisedTenants as any}
        properties={properties}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
