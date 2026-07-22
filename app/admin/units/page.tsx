import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import ExpandableForm from "@/components/layout/ExpandableForm";
import UnitGrid from "@/components/units/UnitGrid";
import LocalPropertyFilter from "@/components/layout/LocalPropertyFilter";
import UnitForm from "./UnitForm";

export const dynamic = "force-dynamic";

export default async function UnitsPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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

  const filteredUnits = activePropertyId
    ? units.filter((u) => u.property_id === activePropertyId)
    : units;
  const activeProperty = activePropertyId
    ? properties.find((p) => p.property_id === activePropertyId)
    : undefined;

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Units
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {activeProperty
              ? `Units in ${activeProperty.property_name}`
              : "Manage individual units across all properties."}
          </p>
        </div>
        <LocalPropertyFilter
          properties={properties}
          activePropertyId={activePropertyId}
        />
      </div>

      <ExpandableForm title="Add New Unit" buttonLabel="New Unit">
        <UnitForm properties={properties} activePropertyId={activePropertyId} />
      </ExpandableForm>

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Current Units
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {filteredUnits.length} unit{filteredUnits.length === 1 ? "" : "s"}
          </span>
        </div>

        <UnitGrid units={filteredUnits} />
      </div>
    </div>
  );
}
