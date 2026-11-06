import Link from "next/link";

/**
 * The setup chain, shown only while it is incomplete.
 *
 * Nothing in the app explained that a property needs units, units need a
 * tenant, and a lease is the thing that joins them — so a new admin could add
 * a property and then be stuck on an empty Leases page with no idea what was
 * missing. This names the order and marks how far along the active property is.
 *
 * It used to disappear at the first lease - one step short: a lease bills
 * nothing until it has charges, and that is the step nobody guesses. It now
 * runs through to the first invoices.
 *
 * It also used to return null once every step was done, which meant the only
 * thing in the app that explains the operating model was visible exclusively
 * to an admin with an empty database - never to a tester, a supervisor, or
 * anyone taking over a running property. It now collapses to a single strip
 * instead of vanishing: still out of the way, still there to open. A <details>
 * does the collapsing, so this stays a Server Component.
 */
export type SetupCounts = {
  properties: number;
  units: number;
  tenants: number;
  leases: number;
  /** Active leases that an invoice run would write nothing for. */
  unbillableLeases: number;
  invoices: number;
};

export default function SetupFlow({
  counts,
  propertyName,
}: {
  counts: SetupCounts;
  propertyName?: string | null;
}) {
  const chargesDone = counts.leases > 0 && counts.unbillableLeases === 0;
  const allDone = counts.leases > 0 && chargesDone && counts.invoices > 0;

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
      detail: counts.leases > 0 ? `${counts.leases} active` : "Joins a tenant to a unit",
    },
    {
      href: "/admin/billing/recurring-charges",
      label: "Set up their charges",
      done: chargesDone,
      detail:
        counts.unbillableLeases > 0
          ? `${counts.unbillableLeases} lease${counts.unbillableLeases > 1 ? "s have" : " has"} nothing to bill`
          : counts.leases > 0
          ? "Every lease has something to bill"
          : "Rent and fees each lease pays",
    },
    {
      href: "/admin/invoices",
      label: "Raise the first invoices",
      done: counts.invoices > 0,
      detail: counts.invoices > 0 ? `${counts.invoices} raised` : "Generate this month's bills",
    },
  ];

  const nextStep = steps.find((s) => !s.done);

  return (
    <details
      open={!allDone}
      className={`group rounded-xl border p-4 ${
        allDone
          ? "border-outline-variant/50 bg-surface-container"
          : "border-primary/25 bg-primary/[0.04]"
      }`}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <h2 className="flex items-baseline gap-1.5 text-sm font-bold text-white">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-on-surface-variant transition-transform group-open:rotate-90">
            chevron_right
          </span>
          {allDone
            ? "How a property gets billed"
            : `${counts.invoices > 0 ? "Billing for" : "Setting up"} ${propertyName ?? "this property"}`}
        </h2>
        <p className="text-[11px] text-on-surface-variant">
          {allDone
            ? "Property → Units → Tenants → Lease → Charges → Invoices"
            : nextStep
            ? `Next: ${nextStep.label.toLowerCase()}`
            : "All set"}
        </p>
      </summary>

      <ol className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
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
                  <span className="block line-clamp-2 text-[11px] leading-snug text-on-surface-variant">
                    {step.detail}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
