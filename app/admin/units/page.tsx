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

  const properties = await listPropertiesForUnits();
  const isReal = (id?: string) => !!id && properties.some((p) => p.property_id === id);

  // Units are always managed one property at a time — there is no "all
  // properties" view. Precedence: a ?property= deep link (e.g. "View units"
  // from a property card) → the universal property picked in the top bar →
  // the first property. Only ids that actually exist are accepted.
  const activePropertyId =
    (isReal(urlPropertyId) ? urlPropertyId : undefined) ??
    (isReal(cookiePropertyId) ? cookiePropertyId : undefined) ??
    properties[0]?.property_id ??
    null;

  // Scope the query itself, so every filter and count downstream is already
  // confined to this property.
  const units = activePropertyId ? await listUnits(activePropertyId) : [];

  const activeProperty = properties.find((p) => p.property_id === activePropertyId) ?? null;

  // A deep link can point at a different property than the top-bar switcher.
  // Tell the client to push it into the universal context so the two agree.
  const contextOutOfSync = !!activePropertyId && cookiePropertyId !== activePropertyId;

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
    status_remark: (u as { status_remark?: string | null }).status_remark ?? null,
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
      <div className="flex flex-col gap-3 border-b border-outline-variant/30 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-high text-on-surface-variant">
              <span className="material-symbols-outlined text-[20px]">meeting_room</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Units</h1>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            {activeProperty ? (
              <>
                Managing <span className="font-semibold text-on-surface">{activeProperty.property_name}</span>.
                Switch property from the selector in the top bar.
              </>
            ) : (
              "No properties yet — add a property before creating units."
            )}
          </p>
        </div>
      </div>

      <UnitsClient
        initialUnits={serialisedUnits}
        properties={properties}
        activePropertyId={activePropertyId}
        activePropertyName={activeProperty?.property_name ?? null}
        contextOutOfSync={contextOutOfSync}
      />
    </div>
  );
}
