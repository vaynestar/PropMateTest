import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import ExpandableForm from "@/components/layout/ExpandableForm";
import UnitGrid from "@/components/units/UnitGrid";

export const dynamic = "force-dynamic";



async function addUnit(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);

  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property_id: formData.get("property_id") || null,
      unit_number: String(formData.get("unit_number")),
      unit_type: String(formData.get("unit_type")),
      floor_number: String(formData.get("floor_number")),
      area_sqft: String(formData.get("area_sqft")),
      monthly_rent: String(formData.get("monthly_rent") || "0"),
      status: String(formData.get("status")),
    }),
  });

  revalidatePath("/admin/units");
}

async function removeUnit(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);

  await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/units?id=${String(
      formData.get("unit_id")
    )}`,
    { method: "DELETE" }
  );

  revalidatePath("/admin/units");
}

export default async function UnitsPage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;

  const [units, properties] = await Promise.all([
    listUnits(),
    listPropertiesForUnits(),
  ]);

  const activePropertyId = propertyId || (properties[0]?.property_id ?? null);

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
      </div>

      <ExpandableForm title="Add New Unit" buttonLabel="New Unit">
        <form action={addUnit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <select
            name="property_id"
            defaultValue=""
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option
                key={property.property_id}
                value={property.property_id}
                selected={
                  activeProperty?.property_id === property.property_id
                }
              >
                {property.property_name} ({property.property_type})
              </option>
            ))}
          </select>

          <input
            name="unit_number"
            placeholder="Unit No. (e.g., A-12-03)"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <input
            name="unit_type"
            placeholder="Type (e.g., Condominium)"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <input
            name="floor_number"
            type="number"
            placeholder="Floor No."
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <input
            name="area_sqft"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Area (sqft)"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <input
            name="monthly_rent"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monthly rent (MYR)"
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <select
            name="status"
            defaultValue="Vacant"
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            <option value="Vacant">Vacant</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          <button
            type="submit"
            className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 lg:col-span-3 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Add Unit
          </button>
        </form>
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

        <UnitGrid units={filteredUnits} removeAction={removeUnit} />
      </div>
    </div>
  );
}
