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
      where: { is_archived: false },
      select: { property_id: true, property_name: true },
      orderBy: { property_name: "asc" },
    }),
  ]);

  // A resident can hold tenancies in more than one property, so this list stays
  // global — but it opens on whichever property the top bar is working in.
  const activePropertyId = await getActivePropertyId();

  /*
   * What each resident owes (DEV-264). "In arrears" is the question an office
   * actually brings to this screen, and the list could not answer it: a
   * resident who owes RM 25,030 looked exactly like one who owes nothing.
   */
  const owedByTenant: Record<string, number> = {};
  const unpaid = await prisma.invoice.findMany({
    where: { status: { notIn: ["Paid", "Inactive"] } },
    select: { total_amount: true, lease: { select: { user_id: true } } },
  });
  for (const inv of unpaid) {
    const uid = inv.lease?.user_id;
    if (!uid) continue;
    // Rule 6.
    owedByTenant[uid] = (owedByTenant[uid] ?? 0) + Number(inv.total_amount ?? 0);
  }

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
    // Dates cannot cross the boundary as Date objects and stay formattable.
    last_login_at: u.last_login_at ? u.last_login_at.toISOString() : null,
    locked_until: u.locked_until ? u.locked_until.toISOString() : null,
    created_at: u.created_at.toISOString(),
    owes: owedByTenant[u.user_id] ?? 0,
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
        title="Residents"
        subtitle="Everyone with a login to the resident app. A resident is only attached to a unit through a tenancy — add the person here, then start their tenancy."
      />

      {/*
        Keyed on the active property. The client holds the chosen property in
        state seeded from this prop, and `useState` only reads its argument on
        the first render - so switching property in the top bar re-rendered the
        server component with new data while this filter stayed on the old one,
        and the list showed "No Residents Found" until the page was reloaded.
        The key remounts it, which is the React answer to "reset state when a
        prop changes".
      */}
      <TenantsClient
        key={activePropertyId ?? "all"}
        initialTenants={serialisedTenants as any}
        properties={properties}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
