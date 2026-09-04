import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import UnitsClient from "@/components/units/UnitsClient";

export const dynamic = "force-dynamic";

export default async function UnitsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const searchParams = await props.searchParams;
  const urlPropertyId = searchParams.property as string | undefined;
  const cookiePropertyId = cookieStore.get("propmate_property_id")?.value;

  const [units, properties] = await Promise.all([
    listUnits(),
    listPropertiesForUnits(),
  ]);

  const activePropertyId = urlPropertyId || cookiePropertyId || (properties[0]?.property_id ?? null);

  // Prisma returns Decimal for area_sqft / monthly_rent. Passing those straight
  // into a Client Component makes React log "Only plain objects can be passed to
  // Client Components" for every unit on every render. Serialise here — this is
  // AGENTS.md Rule 6.
  const serialisedUnits = units.map((u) => ({
    unit_id: u.unit_id,
    property_id: u.property_id,
    unit_number: u.unit_number,
    unit_type: u.unit_type,
    floor_number: u.floor_number,
    area_sqft: Number(u.area_sqft),
    monthly_rent: Number(u.monthly_rent ?? 0),
    status: u.status,
    property: u.property
      ? { property_id: u.property.property_id, property_name: u.property.property_name }
      : undefined,
    leases: (u.leases ?? []).map((l: any) => ({
      lease_id: l.lease_id,
      status: l.status,
      tenant: l.tenant
        ? {
            user_id: l.tenant.user_id,
            user_name: l.tenant.user_name,
            user_email: l.tenant.user_email,
            phone_number: l.tenant.phone_number ?? null,
          }
        : undefined,
    })),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-[20px]">meeting_room</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Units Inventory</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage unit specifications, floor plans, occupancy status, and tenant assignments
          </p>
        </div>
      </div>

      {/* Interactive Units Client */}
      <UnitsClient
        initialUnits={serialisedUnits}
        properties={properties}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
