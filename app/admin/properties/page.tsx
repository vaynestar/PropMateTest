import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProperties } from "@/lib/property-management";
import ExpandableForm from "@/components/layout/ExpandableForm";
import PropertyForm from "./PropertyForm";
import PropertyDeleteForm from "./PropertyDeleteForm";

export const dynamic = "force-dynamic";

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
        <PropertyForm />
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
              <PropertyDeleteForm propertyId={p.property_id} />
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
