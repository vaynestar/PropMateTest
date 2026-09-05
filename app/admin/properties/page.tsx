import { requireUser } from "@/lib/auth";
import { listProperties } from "@/lib/property-management";
import PropertiesClient from "@/components/properties/PropertiesClient";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  await requireUser(["Admin"]);
  const properties = await listProperties();
  
  const activePropertyId = (await getActivePropertyId()) ?? "";

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Properties Portfolio</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage residential strata developments, unit inventories, and default operational scopes
          </p>
        </div>
      </div>

      {/* Interactive Client Workspace */}
      <PropertiesClient
        initialProperties={properties as any}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
