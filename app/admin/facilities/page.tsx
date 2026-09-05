import { requireUser } from "@/lib/auth";
import { listFacilities } from "@/lib/facility-management";
import { listProperties } from "@/lib/property-management";
import AdminFacilitiesManager from "@/components/facilities/AdminFacilitiesManager";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function FacilitiesPage() {
  await requireUser(["Admin"]);
  const propertyId = await getActivePropertyId();

  let facilities: any[] = [];
  let allProperties: any[] = [];

  try {
    const [facs, props] = await Promise.all([
      listFacilities(),
      listProperties(),
    ]);
    facilities = facs || [];
    allProperties = props || [];
  } catch (err) {
    console.error("Error loading facilities data:", err);
  }

  const activeProperty = propertyId 
    ? allProperties.find((p) => p.property_id === propertyId) 
    : allProperties[0];

  // Extract all existing unique facility types created by admin
  const existingTypes = Array.from(
    new Set(facilities.map((f) => f.facility_type).filter(Boolean))
  );

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Facilities
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage shared facilities, maintenance schedules, and resident booking rules.
        </p>
      </div>

      <AdminFacilitiesManager
        facilities={facilities}
        allProperties={allProperties}
        activeProperty={activeProperty}
        existingTypes={existingTypes}
      />
    </div>
  );
}
