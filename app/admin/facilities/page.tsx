import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listFacilities } from "@/lib/facility-management";
import { listProperties } from "@/lib/property-management";
import ExpandableForm from "@/components/layout/ExpandableForm";

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

const TYPE_ACCENT: Record<string, string> = {
  "Swimming Pool": "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
  Gym: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
  "Function Hall": "bg-primary shadow-[0_0_10px_rgba(208,188,255,0.5)]",
  "Badminton Court": "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
  "BBQ Area": "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]",
  "Multi-purpose Hall": "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]",
  Other: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]",
};

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

      <ExpandableForm title="Add Facility" buttonLabel="New Facility">
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
      </ExpandableForm>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
        {facilities.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant col-span-full">
            No facilities yet. Click &quot;New Facility&quot; to add one.
          </p>
        )}
        {facilities.map((f) => (
          <div
            key={f.facility_id}
            className="glass-card rounded-xl p-6 flex flex-col relative overflow-hidden group"
          >
            <div
              className={`absolute top-0 left-0 w-1 h-full ${
                TYPE_ACCENT[f.facility_type] ?? TYPE_ACCENT.Other
              }`}
            />
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-title-lg text-title-lg text-on-surface font-bold pr-6">
                {f.facility_name}
              </h4>
              <span className="material-symbols-outlined text-on-surface-variant">
                {f.is_bookable ? "event_available" : "lock"}
              </span>
            </div>

            <div className="space-y-3 mb-6 flex-1">
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Property
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  {f.property.property_name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Type
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  {f.facility_type}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Capacity
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  {f.max_capacity}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Bookings
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  {f._count.bookings}
                </span>
              </div>
            </div>

            <form action={removeFacility} className="mt-auto">
              <input
                type="hidden"
                name="facility_id"
                value={f.facility_id}
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-error-container border border-error-container/30 hover:bg-error-container/10 transition-all font-label-md text-label-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
