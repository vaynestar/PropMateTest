"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import MediaViewer from "@/components/ui/MediaViewer";
import { REPORTS, MODULE_ORDER, type ReportDef } from "@/lib/reports/catalog";
import { BTN } from "@/components/admin/ui";

/**
 * The report picker (DEV-249).
 *
 * One "Print report" button used to print the dashboard itself. DEV-248
 * replaced it with a single ten-page document covering everything; the user
 * asked for the library instead - "module based, no need so details ... 5 to
 * 10 reports to view that will be commonly used". So: pick the question, get
 * the page that answers it.
 *
 * The property and period showing on the Reports screen travel with the
 * choice, so the printed copy matches what the admin was looking at. Reports
 * marked "as at today" ignore the period, and say so on the card rather than
 * printing a window they did not use.
 */
export default function ReportLibrary({
  propertyId,
  dateRange,
  rangeLabel,
  propertyLabel,
}: {
  propertyId: string;
  dateRange: string;
  rangeLabel: string;
  propertyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<ReportDef | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Escape closes the picker; the viewer handles its own.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !viewing && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, viewing]);

  const href = (slug: string) => {
    const p = new URLSearchParams();
    if (propertyId !== "ALL") p.set("propertyId", propertyId);
    if (dateRange !== "ytd") p.set("dateRange", dateRange);
    const q = p.toString();
    return `/print/report/${slug}${q ? `?${q}` : ""}`;
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN.primary}>
        <span className="material-symbols-outlined text-[18px]">print</span>
        Print a report
      </button>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Choose a report"
              className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-outline-variant/50 bg-surface-container-lowest shadow-2xl sm:max-w-2xl sm:rounded-3xl"
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-lowest px-5 py-3.5">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-on-surface">Print a report</h2>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {propertyLabel} · {rangeLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="pressable shrink-0 rounded-lg border border-outline-variant/60 bg-surface-container-high px-2 py-1 text-on-surface"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
                {MODULE_ORDER.map((mod) => {
                  const items = REPORTS.filter((r) => r.module === mod);
                  if (!items.length) return null;
                  return (
                    <section key={mod} className="mb-5 last:mb-0">
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {mod}
                      </h3>
                      <div className="flex flex-col gap-2">
                        {items.map((r) => (
                          <button
                            key={r.slug}
                            type="button"
                            onClick={() => setViewing(r)}
                            className="pressable flex items-start gap-3 rounded-xl border border-outline-variant/50 bg-surface-container p-3 text-left transition-colors hover:bg-surface-container-high"
                          >
                            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-primary">
                              {r.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-on-surface">{r.title}</span>
                              <span className="mt-0.5 block text-xs leading-snug text-on-surface-variant">
                                {r.blurb}
                              </span>
                              <span className="mt-1 inline-block rounded border border-outline-variant/50 px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
                                {r.basis === "period" ? rangeLabel : "As at today"}
                              </span>
                            </span>
                            <span className="material-symbols-outlined mt-1 shrink-0 text-[18px] text-on-surface-variant">
                              chevron_right
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {viewing && (
        <MediaViewer
          items={[{ src: href(viewing.slug), title: viewing.title, kind: "doc" }]}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
