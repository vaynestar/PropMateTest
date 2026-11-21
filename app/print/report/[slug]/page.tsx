import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDateRangeBoundary, type DateRangeKey } from "@/lib/reports";
import { getInvoiceDocSettings, docDate } from "@/lib/invoice-document";
import { getActivePropertyId } from "@/lib/property-context.server";
import { todayDateMY } from "@/lib/short-date";
import prisma from "@/lib/prisma";
import { findReport, RANGE_LABEL, type ReportBlock } from "@/lib/reports/catalog";
import { loadReport } from "@/lib/reports/print-data";
import ReportPrintToolbar from "../ReportPrintToolbar";

export const dynamic = "force-dynamic";

/*
 * One report, printable (DEV-249).
 *
 * DEV-248 put every module into a single ten-page document. The user's
 * verdict: "i think the report can be module based, and no need so details".
 * So the library replaced it - nine reports, one question each, one or two
 * pages. The front matter shrank with it: a header strip saying what this is
 * and what it covers, and that is all. The nine-clause Basis of preparation
 * and the contents page went with the monolith; a one-page arrears list does
 * not need a table of contents.
 *
 * All nine share this renderer, so they cannot drift apart visually, and a
 * tenth report is a loader in lib/reports/print-data.ts and an entry in the
 * catalog - no new page.
 */

type Params = Promise<{ slug: string }>;
type Query = Promise<{ propertyId?: string; dateRange?: string }>;

async function resolve(params: Params, searchParams: Query) {
  const { slug } = await params;
  const sp = await searchParams;
  const propertyId = sp.propertyId ? sp.propertyId : (await getActivePropertyId()) ?? "ALL";
  const dateRange = (
    ["30d", "quarter", "ytd", "all"].includes(sp.dateRange || "") ? sp.dateRange : "ytd"
  ) as DateRangeKey;
  return { slug, propertyId, dateRange };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Query;
}) {
  const { slug } = await resolve(params, searchParams);
  const def = findReport(slug);
  /*
   * The browser prints this on EVERY page beside the page number. It is the
   * only running header Chrome offers - it has never implemented the @page
   * margin boxes, and a position: fixed footer reserves no space, so the one
   * tried in DEV-248 printed over the last row of any table that reached the
   * bottom of a page.
   */
  return { title: def ? `${def.title} — PropMate` : "Report" };
}

export default async function PrintOneReport({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Query;
}) {
  const user = await requireUser(["Admin"]);
  const { slug, propertyId, dateRange } = await resolve(params, searchParams);

  const def = findReport(slug);
  if (!def) notFound();

  const [report, settings, property] = await Promise.all([
    loadReport(slug, propertyId, dateRange),
    getInvoiceDocSettings(),
    propertyId === "ALL"
      ? null
      : prisma.propertyMaster.findUnique({
          where: { property_id: propertyId },
          select: { property_name: true },
        }),
  ]);
  if (!report) notFound();

  const now = new Date();
  const from = getDateRangeBoundary(dateRange);
  const scope = propertyId === "ALL" ? "All properties" : property?.property_name ?? "Unknown property";
  const issuer = settings.issuer || "PropMate Property Management";

  /*
   * A period report states the window it counted; an "as at" report states the
   * day it was taken. Printing "Year to date" on an arrears list would be a
   * lie - the arrears are today's position, whatever the filter says.
   */
  const coverage =
    def.basis === "period"
      ? `${RANGE_LABEL[dateRange]}${from ? ` · ${docDate(from)} – ${docDate(now)}` : ` · up to ${docDate(now)}`}`
      : `Position as at ${docDate(todayDateMY())}`;

  const generated = `${docDate(now)}, ${new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(now)} MYT`;

  return (
    <div className="mx-auto max-w-[210mm] bg-white px-6 py-8 text-slate-900 sm:px-10 sm:py-10 print:max-w-none print:px-0 print:py-0">
      <style>{`
        /*
         * app/print/layout.tsx sets bg-white and color-scheme: light on its own
         * <html>, but React keeps the ROOT layout's <html class="dark"> and
         * discards the nested one - so the body stayed Obsidian navy under the
         * white sheet. Forced here, scoped to this route.
         */
        :root { color-scheme: light !important; }
        html, body { background: #ffffff !important; color: #0f172a !important; }
        @page { size: A4 portrait; margin: 14mm 13mm; }
        @media print {
          .rpt-block { break-inside: avoid; }
          h2 { break-after: avoid; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <ReportPrintToolbar title={def.title} />

      {/* Header strip: what this is, what it covers, who ran it. */}
      <header className="rpt-block border-b-[3px] border-slate-900 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {issuer} · {def.module}
            </p>
            <h1 className="mt-1.5 text-[24px] font-black leading-tight tracking-tight sm:text-[27px]">
              {def.title}
            </h1>
            <p className="mt-1 text-[12.5px] text-slate-600">{report.summary}</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-200 pt-3 text-[11px] sm:grid-cols-4">
          {[
            ["Property", scope],
            [def.basis === "period" ? "Period covered" : "Basis", coverage],
            ["Generated", generated],
            ["Prepared by", `${user.user_name} · ${user.role}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-bold uppercase tracking-wider text-slate-500">{k}</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-6 flex flex-col gap-6">
        {report.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>

      <footer className="rpt-block mt-8 border-t border-slate-300 pt-3 text-[10px] leading-relaxed text-slate-500">
        Read from the PropMate database on {generated} by {user.user_name}. Amounts in{" "}
        {settings.currency}; dates and times are Malaysia time. Internal — management use only; a
        later copy supersedes this one.
        {settings.contact && <> {settings.contact}</>}
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Block({ block }: { block: ReportBlock }) {
  if (block.kind === "note") {
    return (
      <p className="rpt-block rounded border border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        {block.text}
      </p>
    );
  }

  if (block.kind === "kpi") {
    return (
      /* Separate boxes, not one grid with hairline gaps: a report with five
         KPIs left the sixth cell as a grey block where a figure should be. */
      <div className="rpt-block grid grid-cols-2 gap-2 sm:grid-cols-3">
        {block.items.map((k) => (
          <div key={k.label} className="rounded border border-slate-300 bg-white px-3 py-2.5">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-0.5 text-[17px] font-black leading-tight tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>
    );
  }

  const { caption, head, align, rows, total, empty } = block;
  const at = (i: number) => {
    const a = align ? align[i] : i === 0 ? "l" : "r";
    return a === "l" ? "text-left" : "text-right tabular-nums";
  };

  /*
   * Deliberately NOT .rpt-block. break-inside: avoid on a 60-row table cannot
   * be honoured, and on a 21-row one it is honoured by pushing the whole table
   * to the next page - leaving half of page 1 blank. The rows and the heading
   * group carry the no-break rules instead, so a long table splits where it
   * must and repeats its column headings when it does.
   */
  return (
    <section>
      {caption && (
        <h2 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500">{caption}</h2>
      )}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-y-2 border-slate-800 bg-slate-100">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-1.5 px-2 font-bold uppercase tracking-wide text-slate-600 ${at(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-b border-slate-200">
              <td colSpan={head.length} className="py-3 px-2 text-center italic text-slate-500">
                {empty ?? "No records."}
              </td>
            </tr>
          ) : (
            rows.map((r, ri) => (
              <tr key={ri} className="border-b border-slate-200">
                {r.map((cell, ci) => (
                  <td key={ci} className={`py-1.5 px-2 align-top ${at(ci)}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
          {total && rows.length > 0 && (
            <tr className="border-b-2 border-slate-800 bg-slate-50 font-bold">
              {total.map((cell, ci) => (
                <td key={ci} className={`py-1.5 px-2 ${at(ci)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
