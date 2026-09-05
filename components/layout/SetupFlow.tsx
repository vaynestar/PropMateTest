import Link from "next/link";

/**
 * The setup chain, shown only while it is incomplete.
 *
 * Nothing in the app explained that a property needs units, units need a
 * tenant, and a lease is the thing that joins them — so a new admin could add
 * a property and then be stuck on an empty Leases page with no idea what was
 * missing. This names the order and marks how far along the active property is.
 *
 * It disappears once a lease exists, so it never becomes permanent chrome.
 */
export type SetupCounts = {
  properties: number;
  units: number;
  tenants: number;
  leases: number;
};

export default function SetupFlow({
  counts,
  propertyName,
}: {
  counts: SetupCounts;
  propertyName?: string | null;
}) {
  if (counts.leases > 0) return null;

  const steps = [
    {
      href: "/admin/properties",
      label: "Add a property",
      done: counts.properties > 0,
      detail:
        counts.properties > 0
          ? propertyName ?? `${counts.properties} added`
          : "The building itself",
    },
    {
      href: "/admin/units",
      label: "Add its units",
      done: counts.units > 0,
      detail: counts.units > 0 ? `${counts.units} in this property` : "Nothing to rent out yet",
    },
    {
      href: "/admin/tenants",
      label: "Add the tenants",
      done: counts.tenants > 0,
      detail: counts.tenants > 0 ? `${counts.tenants} on record` : "The people who will live there",
    },
    {
      href: "/admin/leases",
      label: "Create a lease",
      done: counts.leases > 0,
      detail: "Joins a tenant to a unit and starts billing",
    },
  ];

  const nextStep = steps.find((s) => !s.done);

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-white">Setting up {propertyName ?? "this property"}</h2>
        <p className="text-[11px] text-on-surface-variant">
          {nextStep ? `Next: ${nextStep.label.toLowerCase()}` : "Ready — create the lease"}
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, i) => {
          const isNext = step === nextStep;
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className={`pressable flex h-full items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                  isNext
                    ? "border-primary/50 bg-surface-container-high"
                    : "border-outline-variant/50 bg-surface-container hover:border-outline-variant"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    step.done
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isNext
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {step.done ? (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">{step.label}</span>
                  <span className="block truncate text-[11px] text-on-surface-variant">
                    {step.detail}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
