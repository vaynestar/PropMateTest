import { revalidatePath } from 'next/cache';

import {
  createUnit,
  deleteUnit,
  listPropertiesForUnits,
  listUnits,
} from '@/lib/unit-management';

export default async function UnitsPage() {
  const [units, properties] = await Promise.all([
    listUnits(),
    listPropertiesForUnits(),
  ]);

  async function addUnit(formData: FormData) {
    'use server';

    await createUnit({
      property_id: formData.get('property_id') as string | null,
      unit_number: formData.get('unit_number') as string,
      unit_type: formData.get('unit_type') as string,
      floor_number: formData.get('floor_number') as string,
      area_sqft: formData.get('area_sqft') as string,
      status: formData.get('status') as string,
    });

    revalidatePath('/units');
  }

  async function removeUnit(formData: FormData) {
    'use server';

    await deleteUnit(formData.get('unit_id') as string);
    revalidatePath('/units');
  }

  return (
    <div className="mx-auto max-w-5xl p-8 font-sans">
      <h1 className="mb-8 text-3xl font-bold">Unit Management</h1>

      <div className="mb-8 rounded-lg bg-gray-100 p-6">
        <h2 className="mb-4 text-xl font-semibold">Add New Unit</h2>

        {properties.length === 0 && (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            No property records were found. Saving a unit will automatically
            create a default property for this prototype.
          </p>
        )}

        <form action={addUnit} className="grid gap-4 md:grid-cols-2">
          <select
            name="property_id"
            defaultValue=""
            className="rounded border p-2"
          >
            <option value="">Use default / first available property</option>
            {properties.map((property) => (
              <option key={property.property_id} value={property.property_id}>
                {property.property_name} ({property.property_type})
              </option>
            ))}
          </select>

          <input
            type="text"
            name="unit_number"
            placeholder="Unit Number (e.g., A-12-03)"
            required
            className="rounded border p-2"
          />

          <input
            type="text"
            name="unit_type"
            placeholder="Unit Type (e.g., Condominium)"
            required
            className="rounded border p-2"
          />

          <input
            type="number"
            name="floor_number"
            placeholder="Floor Number"
            required
            className="rounded border p-2"
          />

          <input
            type="number"
            step="0.01"
            min="0.01"
            name="area_sqft"
            placeholder="Area (sqft)"
            required
            className="rounded border p-2"
          />

          <select
            name="status"
            defaultValue="Vacant"
            className="rounded border p-2"
          >
            <option value="Vacant">Vacant</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Save Unit
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Current Units</h2>

        <div className="grid gap-4">
          {units.map((unit) => (
            <div
              key={unit.unit_id}
              className="flex flex-col gap-4 rounded-lg border p-4 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-bold">{unit.unit_number}</p>
                <p className="text-sm text-gray-600">
                  Type: {unit.unit_type} | Floor: {unit.floor_number} | Area:{' '}
                  {unit.area_sqft.toString()} sqft
                </p>
                <p className="text-sm text-gray-600">Status: {unit.status}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Property: {unit.property.property_name}
                </p>
              </div>

              <form action={removeUnit}>
                <input type="hidden" name="unit_id" value={unit.unit_id} />
                <button
                  type="submit"
                  className="rounded bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}

          {units.length === 0 && (
            <p className="italic text-gray-500">
              No units found. Create one above to start Unit Management.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
