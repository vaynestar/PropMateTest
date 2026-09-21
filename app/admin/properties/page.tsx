import { requireUser } from "@/lib/auth";
import { listProperties } from "@/lib/property-management";
import PropertiesClient from "@/components/properties/PropertiesClient";
import { getActivePropertyId } from "@/lib/property-context.server";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  await requireUser(["Admin"]);
  const properties = await listProperties();
  
  const activePropertyId = (await getActivePropertyId()) ?? "";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Properties"
        subtitle="Add properties, track their units, and pick which one the rest of the app works in."
      />

      {/* Interactive Client Workspace */}
      <PropertiesClient
        initialProperties={properties as any}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
