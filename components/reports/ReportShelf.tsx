import Link from "next/link";
import { REPORTS, MODULE_ORDER } from "@/lib/reports/catalog";

/**
 * The nine reports, on the page (DEV-273).
 *
 * The library existed — DEV-249 built it, grouped by module, with one shared
 * A4 renderer behind it — but it lived behind a **Print a report** button and
 * a modal. That is one click and one dismissal away from the thing the screen
 * is named after, and the batch-4 artboard makes the nine reports the page.
 *
 * This is deliberately a plain list of links to the print route rather than a
 * second copy of the picker: the modal still exists for previewing, and the
 * two must not drift apart. Both read `REPORTS` from the same catalog, so a
 * tenth report appears in both without touching either.
 */
export default function ReportShelf({
  propertyId,
  dateRange,
  rangeLabel,
}: {
  propertyId: string;
  dateRange: string;
  rangeLabel: string;
}) {
  const href = (slug: string) => {
    const p = new URLSearchParams();
    if (propertyId !== "ALL") p.set("propertyId", propertyId);
    if (dateRange !== "ytd") p.set("dateRange", dateRange);
    const q = p.toString();
    return `/print/report/${slug}${q ? `?${q}` : ""}`;
  };

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container">
      <div className="border-b border-outline-variant/40 px-4 py-3">
        <h2 className="text-[15px] font-bold text-on-surface">Print a report</h2>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          One report, one question, one or two pages. Each opens as an A4 sheet you can print or
          save.
        </p>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULE_ORDER.map((mod) => {
          const items = REPORTS.filter((r) => r.module === mod);
          if (!items.length) return null;
          return (
            <div key={mod} className="min-w-0">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                {mod}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((r) => (
                  <Link
                    key={r.slug}
                    href={href(r.slug)}
                    target="_blank"
                    className="pressable flex items-start gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-high p-3 transition-colors hover:border-primary/40"
                  >
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-primary">
                      {r.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-on-surface">{r.title}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-on-surface-variant">
                        {r.blurb}
                      </span>
                      {/* Which window it covers — an "as at" report ignores the
                          date filter, and saying so stops the filter looking
                          broken when the figures do not move. */}
                      <span className="mt-1.5 inline-block rounded border border-outline-variant/50 px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
                        {r.basis === "period" ? rangeLabel : "As at today"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
