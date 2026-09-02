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
        initialUnits={units as any}
        properties={properties}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
