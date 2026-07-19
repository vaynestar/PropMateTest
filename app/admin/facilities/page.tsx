import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listFacilities } from "@/lib/facility-management";
import { listProperties } from "@/lib/property-management";

export const dynamic = "force-dynamic";

const FACILITY_TYPES = [
  "Swimming Pool",
  "Gym",
  "Function Hall",
  "Badminton Court",
  "BBQ Area",
  "Multi-purpose Hall",
  "Other",
];

async function addFacility(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/facilities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      property_id: String(formData.get("property_id")),
      facility_name: String(formData.get("facility_name")),
      facility_type: String(formData.get("facility_type")),
      max_capacity: Number(formData.get("max_capacity")),
      is_bookable: formData.get("is_bookable") === "on",
    }),
  });
  revalidatePath("/admin/facilities");
}

async function removeFacility(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);
  const id = String(formData.get("facility_id"));
  await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/facilities?id=${id}`,
    { method: "DELETE" }
  );
  revalidatePath("/admin/facilities");
}

export default async function FacilitiesPage() {
  await requireUser(["Admin"]);
  const [facilities, properties] = await Promise.all([
    listFacilities(),
    listProperties(),
  ]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Facilities
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage shared facilities and their booking availability.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="font-title-lg text-title-lg text-on-surface mb-4">
          Add Facility
        </h2>
        <form action={addFacility} className="grid gap-4 md:grid-cols-2">
          <select
            name="property_id"
            required
            defaultValue=""
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>

          <input
            name="facility_name"
            placeholder="Facility name"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <select
            name="facility_type"
            defaultValue="Swimming Pool"
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            name="max_capacity"
            type="number"
            min="1"
            placeholder="Max capacity"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />

          <label className="flex items-center gap-2 md:col-span-2 text-on-surface">
            <input
              type="checkbox"
              name="is_bookable"
              defaultChecked
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            <span className="font-label-md text-label-md">
              Residents can book this facility
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all md:col-span-2"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              add
            </span>
            Add Facility
          </button>
        </form>
      </div>

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            All Facilities
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/30">
          {facilities.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8">
              No facilities yet.
            </p>
          )}
          {facilities.map((f) => (
            <div
              key={f.facility_id}
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-6 py-4"
            >
              <div>
                <p className="font-title-md text-title-md text-on-surface">
                  {f.facility_name}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  {f.facility_type} · {f.property.property_name} · Capacity{" "}
                  {f.max_capacity} · {f._count.bookings} booking
                  {f._count.bookings === 1 ? "" : "s"}
                </p>
              </div>

              <form action={removeFacility} className="shrink-0">
                <input
                  type="hidden"
                  name="facility_id"
                  value={f.facility_id}
                />
                <button
                  type="submit"
                  className="font-label-sm text-label-sm text-error-container hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
