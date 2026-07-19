import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData } from "@/lib/resident";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function ResidentUnitPage() {
  const user = await getSessionUser();
  const { lease } = await getResidentPortalData(user!.userId);

  if (!lease) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant">
        No active tenancy linked to your account.
      </p>
    );
  }

  const unit = lease.unit;

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          My Unit
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Details of your residence.
        </p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">
            apartment
          </span>
          <div>
            <p className="font-headline-md text-headline-md text-on-surface">
              {unit.unit_number}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {unit.property.property_name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
          <Field label="Property" value={unit.property.property_name} />
          <Field label="Address" value={unit.property.address} />
          <Field label="Unit Type" value={unit.unit_type} />
          <Field label="Floor" value={String(unit.floor_number)} />
          <Field label="Area" value={`${unit.area_sqft.toString()} sqft`} />
          <Field label="Monthly Rent" value={formatCurrency(Number(unit.monthly_rent))} />
          <Field label="Move-in Date" value={formatDate(lease.move_in_date)} />
          <Field label="Move-out Date" value={formatDate(lease.move_out_date)} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {label}
      </p>
      <p className="font-label-lg text-label-lg text-on-surface mt-0.5">
        {value}
      </p>
    </div>
  );
}
