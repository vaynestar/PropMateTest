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
    // Scoped to the property chosen in the top bar. listFacilities() already
    // took a propertyId; it simply was not being passed, so the header said
    // "Testing" while the page listed all 17 facilities across all four
    // properties and offered its own picker. Same fault DEV-137 found in
    // recurring charges; DEV-129's sweep missed this module.
    const [facs, props] = await Promise.all([
      listFacilities(propertyId ?? undefined),
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
          Shared spaces in this property, when residents may book them, and what is
          currently closed for maintenance.
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
