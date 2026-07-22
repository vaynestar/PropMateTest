import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createProperty, deleteProperty, listProperties } from "@/lib/property-management";
import ExpandableForm from "@/components/layout/ExpandableForm";

export const dynamic = "force-dynamic";

async function addProperty(formData: FormData) {
  "use server";
  const user = await requireUser(["Admin"]);
  const input = {
    property_name: String(formData.get("property_name")),
    property_type: String(formData.get("property_type")),
    address: String(formData.get("address")),
    city: String(formData.get("city")),
    state: String(formData.get("state")),
    country: String(formData.get("country")),
    postal_code: String(formData.get("postal_code")),
    total_units: "0",
  };
  await createProperty(input, user.userId);
  revalidatePath("/admin/properties");
}

async function removeProperty(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);
  const id = String(formData.get("property_id"));
  await deleteProperty(id);
  revalidatePath("/admin/properties");
}

export default async function PropertiesPage() {
  await requireUser(["Admin"]);
  const properties = await listProperties();

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Properties
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage residential strata properties in your portfolio.
        </p>
      </div>

      <ExpandableForm title="Add New Property" buttonLabel="New Property">
        <form action={addProperty} className="grid gap-4 md:grid-cols-2">
          <input
            name="property_name"
            placeholder="Property name (e.g., Desa Harmoni)"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <input
            name="property_type"
            placeholder="Type (Condominium / Apartment)"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <input
            name="address"
            placeholder="Street address"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary md:col-span-2"
          />
          <input
            name="city"
            placeholder="City"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <input
            name="state"
            placeholder="State"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <input
            name="country"
            placeholder="Country"
            defaultValue="Malaysia"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <input
            name="postal_code"
            placeholder="Postal code"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 md:col-span-2 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Add Property
          </button>
        </form>
      </ExpandableForm>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <div
            key={p.property_id}
            className="glass-card rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-title-lg text-title-lg text-on-surface">
                  {p.property_name}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {p.property_type} · {p.city}, {p.state}
                </p>
              </div>
              <span className="material-symbols-outlined text-primary">
                domain
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant border-b border-outline-variant/30 pb-3">
              {p.address}, {p.postal_code}
            </p>
            
            <div className="flex items-center justify-between mt-1 mb-2">
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-sm">meeting_room</span>
                <span className="font-label-md text-label-md">
                  {p._count.units} Unit{p._count.units !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full mt-auto">
              <Link
                href={`/admin/units?property=${p.property_id}`}
                className="flex-1 text-center py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors text-sm"
              >
                View Units
              </Link>
              <form action={removeProperty} className="flex-1">
                <input
                  type="hidden"
                  name="property_id"
                  value={p.property_id}
                />
                <button
                  type="submit"
                  className="w-full text-center py-2 rounded-lg bg-error-container/10 text-error-container font-medium hover:bg-error-container/20 transition-colors text-sm"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {properties.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant col-span-full">
            No properties yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}
