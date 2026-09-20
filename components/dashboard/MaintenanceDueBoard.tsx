import Link from "next/link";
import { shortDate } from "@/lib/short-date";
import { SectionCard } from "@/components/admin/ui";

/**
 * Facilities needing service, as a board rather than a list (DEV-193; user:
 * "the maintenance due i feel like need to be more attention, or infographic,
 * and need to be in front, especially view in mobile view as well").
 *
 * It sits directly under the stat row - the first thing after the numbers on a
 * phone - and leads with how bad it is: a bar split by overdue / this week /
 * later, then one tile per facility with the day count as the headline.
 */

export type MaintenanceItem = {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  next_maintenance_date: string;
  daysAway: number;
  isOverdue: boolean;
  isClosed: boolean;
};

const BANDS = [
  { key: "overdue", label: "Overdue", bar: "bg-rose-400", chip: "border-rose-500/40 bg-rose-500/15 text-rose-200", rail: "bg-rose-400", value: "text-rose-300" },
  { key: "soon", label: "Within 7 days", bar: "bg-amber-400", chip: "border-amber-500/40 bg-amber-500/15 text-amber-200", rail: "bg-amber-400", value: "text-amber-300" },
  { key: "later", label: "Later", bar: "bg-primary", chip: "border-outline-variant bg-surface-container-highest text-on-surface-variant", rail: "bg-primary/70", value: "text-on-surface" },
] as const;

const bandOf = (d: MaintenanceItem) => (d.isOverdue ? 0 : d.daysAway <= 7 ? 1 : 2);

/** "12 days overdue" / "Due today" / "in 5 days" split into number + words. */
function countdown(item: MaintenanceItem) {
  if (item.isOverdue) {
    const n = Math.abs(item.daysAway);
    return { n: String(n), unit: `day${n === 1 ? "" : "s"} overdue` };
  }
  if (item.daysAway === 0) return { n: "Today", unit: "due" };
  return { n: String(item.daysAway), unit: `day${item.daysAway === 1 ? "" : "s"} left` };
}

export default function MaintenanceDueBoard({ items }: { items: MaintenanceItem[] }) {
  if (!items.length) return null;

  const sorted = [...items].sort((a, b) => a.daysAway - b.daysAway);
  const counts = [0, 0, 0];
  sorted.forEach((i) => counts[bandOf(i)]++);
  const total = sorted.length;
  const overdue = counts[0];

  return (
    <SectionCard
      title="Maintenance due"
      subtitle={
        overdue > 0
          ? `${overdue} facilit${overdue === 1 ? "y is" : "ies are"} past their service date.`
          : "Nothing overdue — here is what is coming."
      }
      icon="handyman"
      action={
        <Link href="/admin/facilities" className="text-xs font-semibold text-primary hover:underline">
          Manage facilities
        </Link>
      }
    >
      {/* How the work splits, at a glance */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
        {BANDS.map((b, i) =>
          counts[i] > 0 ? (
            <div key={b.key} className={b.bar} style={{ width: `${(counts[i] / total) * 100}%` }} title={`${b.label}: ${counts[i]}`} />
          ) : null
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {BANDS.map((b, i) => (
          <span
            key={b.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              counts[i] > 0 ? b.chip : "border-outline-variant/50 bg-transparent text-on-surface-variant/60"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${counts[i] > 0 ? b.bar : "bg-outline-variant"}`} />
            {b.label}
            <span className="tabular-nums">{counts[i]}</span>
          </span>
        ))}
      </div>

      {/* One tile per facility, worst first */}
      <ul className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
        {sorted.slice(0, 8).map((f) => {
          const band = BANDS[bandOf(f)];
          const c = countdown(f);
          return (
            <li key={f.facility_id}>
              <Link
                href="/admin/facilities"
                className="pressable flex h-full gap-3 overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-high/40 p-3 transition-colors hover:border-primary/40"
              >
                <span className={`-my-3 -ml-3 w-1 shrink-0 ${band.rail}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-bold tabular-nums ${band.value}`}>{c.n}</span>
                    <span className="truncate text-[11px] text-on-surface-variant">{c.unit}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold text-white" title={f.facility_name}>
                    {f.facility_name}
                  </span>
                  <span className="block truncate text-[11px] text-on-surface-variant">
                    {f.facility_type} · {shortDate(f.next_maintenance_date.slice(0, 10))}
                  </span>
                  {f.isClosed && (
                    <span className="mt-1.5 inline-block rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      Closed for works
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {sorted.length > 8 && (
        <p className="mt-3 text-center text-xs text-on-surface-variant">
          and {sorted.length - 8} more —{" "}
          <Link href="/admin/facilities" className="font-semibold text-primary hover:underline">
            see all facilities
          </Link>
        </p>
      )}
    </SectionCard>
  );
}
