import { Children, cloneElement, isValidElement } from "react";
import { requireUser } from "@/lib/auth";
import { getReportsData, getDateRangeBoundary, DateRangeKey } from "@/lib/reports";
import { getInvoiceDocSettings, docDate, docMoney } from "@/lib/invoice-document";
import { getActivePropertyId } from "@/lib/property-context.server";
import ReportPrintToolbar from "./ReportPrintToolbar";

export const dynamic = "force-dynamic";

/*
 * The page title is what the browser prints in its own header on EVERY page,
 * beside the page number. That is the only per-page running header Chrome
 * offers - it has never implemented the @page margin boxes, and a
 * position: fixed footer does not reserve space, so the first attempt printed
 * its line straight over the last row of whatever table reached the bottom of
 * the page (Table 2.2 lost "Total arrears"). Naming the document here gets the
 * identification onto every page without eating a row.
 */
type Params = Promise<{ propertyId?: string; dateRange?: string }>;

/** One resolution of the filters, so the printed title and the body agree. */
async function resolveFilters(searchParams: Params) {
  const sp = await searchParams;
  const propertyId = sp.propertyId ? sp.propertyId : (await getActivePropertyId()) ?? "ALL";
  const dateRange = (
    ["30d", "quarter", "ytd", "all"].includes(sp.dateRange || "") ? sp.dateRange : "ytd"
  ) as DateRangeKey;
  const now = new Date();
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(now)
    .replace(/-/g, "");
  const ref = `RPT-${stamp}-${dateRange.toUpperCase()}-${
    propertyId === "ALL" ? "ALL" : propertyId.slice(0, 6).toUpperCase()
  }`;
  return { propertyId, dateRange, ref, now };
}

export async function generateMetadata({ searchParams }: { searchParams: Params }) {
  const { ref } = await resolveFilters(searchParams);
  return { title: `Property Management Report — ${ref}` };
}

/*
 * The printable management report (DEV-248).
 *
 * /admin/reports used to print itself with window.print(). There is not a
 * single @media print rule in the codebase, so what came out of the printer was
 * the dark dashboard: the sidebar, the top bar, the tab strip, the filter
 * buttons, and - because only one tab is mounted at a time - exactly one of the
 * five sections. No title, no period, no property named, no date, no author, no
 * table captions. A screenshot of a screen, not a document.
 *
 * This route is the document. Every section prints, each figure sits in a
 * captioned table, and the front matter says what the report covers and how it
 * was derived, so a printed copy still means something a month later when
 * nobody remembers which filter was selected.
 */

const RANGE_LABEL: Record<DateRangeKey, string> = {
  "30d": "Last 30 days",
  quarter: "Last 90 days",
  ytd: "Year to date",
  all: "All time",
};

const pct = (n: number) => `${Math.round(n)}%`;

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const user = await requireUser(["Admin"]);
  const { propertyId, dateRange, ref, now } = await resolveFilters(searchParams);

  const [data, settings] = await Promise.all([
    getReportsData(propertyId, dateRange),
    getInvoiceDocSettings(),
  ]);

  const money = (n: number) => docMoney(n, settings.currency);

  const from = getDateRangeBoundary(dateRange);
  const periodDates = from ? `${docDate(from)} – ${docDate(now)}` : `Up to ${docDate(now)}`;

  const scope =
    propertyId === "ALL"
      ? "All properties (aggregated)"
      : data.properties?.find((p) => p.property_id === propertyId)?.property_name ?? "Unknown property";

  const issuer = settings.issuer || "PropMate Property Management";

  const o = data.overview;
  const f = data.financial;
  const m = data.maintenance;
  const fac = data.facilities;
  const v = data.visitors;

  const agingTotal =
    f.agingReceivables.current +
    f.agingReceivables.days30 +
    f.agingReceivables.days60 +
    f.agingReceivables.days90Plus;

  const chargeTotal = f.chargeDistribution.reduce((s, c) => s + c.value, 0);

  const SECTIONS = [
    { n: "1", t: "Executive summary" },
    { n: "2", t: "Financials and billing" },
    { n: "3", t: "Helpdesk and service levels" },
    { n: "4", t: "Facility bookings" },
    { n: "5", t: "Visitors and security" },
    { n: "6", t: "Basis of preparation" },
  ];

  return (
    <div className="mx-auto max-w-[210mm] bg-white px-6 py-8 text-slate-900 sm:px-12 sm:py-12 print:max-w-none print:px-0 print:py-0">
      <style>{`
        /*
         * app/print/layout.tsx sets bg-white and color-scheme: light on its own
         * <html>, but React keeps the ROOT layout's <html class="dark"> and
         * drops the nested one - so the page body stays Obsidian navy under the
         * white sheet. A report that fills the page cannot live with that, so
         * it forces light itself. Scoped to this route: the tag only renders
         * here.
         */
        :root { color-scheme: light !important; }
        html, body { background: #ffffff !important; color: #0f172a !important; }
        @page { size: A4 portrait; margin: 16mm 14mm 20mm; }
        @media print {
          html, body { background: #fff !important; }
          .rpt-section { break-inside: auto; }
          .rpt-block { break-inside: avoid; }
          h2, h3 { break-after: avoid; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <ReportPrintToolbar />

      {/* ---------------- Front matter ---------------- */}
      <header className="rpt-block border-b-[3px] border-slate-900 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{issuer}</p>
        <h1 className="mt-2 text-[27px] font-black leading-tight tracking-tight sm:text-[32px]">
          Property Management Report
        </h1>
        <p className="mt-1.5 text-[13px] font-semibold text-slate-600">
          {scope} · {RANGE_LABEL[dateRange]}
        </p>
      </header>

      {/* Document control - what this copy is, and who made it */}
      <section className="rpt-block mt-6">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Document control
        </h2>
        <table className="w-full border-collapse text-[12px]">
          <tbody>
            {[
              ["Report reference", ref],
              ["Property scope", scope],
              ["Reporting period", `${RANGE_LABEL[dateRange]} (${periodDates})`],
              ["Date generated", `${docDate(now)}, ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }).format(now)} (MYT)`],
              ["Prepared by", `${user.user_name} (${user.role})`],
              ["Source system", "PropMate — live operational database"],
              ["Classification", "Internal — management use only"],
            ].map(([k, val]) => (
              <tr key={k} className="border-b border-slate-200 last:border-0">
                <th scope="row" className="w-[36%] py-1.5 pr-3 text-left align-top font-semibold text-slate-500">
                  {k}
                </th>
                <td className="py-1.5 align-top font-medium">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Contents */}
      <section className="rpt-block mt-6 rounded border border-slate-300 bg-slate-50 p-4">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Contents</h2>
        <ol className="space-y-1 text-[12.5px]">
          {SECTIONS.map((s) => (
            <li key={s.n} className="flex gap-2">
              <span className="w-5 shrink-0 font-bold tabular-nums">{s.n}</span>
              <span>{s.t}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- 1. Executive summary ---------------- */}
      <Section n="1" title="Executive summary">
        <p className="mb-4 text-[12.5px] leading-relaxed text-slate-700">
          Over {RANGE_LABEL[dateRange].toLowerCase()} ({periodDates}), {scope} carried{" "}
          <strong>{o.totalUnitsCount}</strong> units at <strong>{pct(o.occupancyRate)}</strong> occupancy.{" "}
          <strong>{money(o.totalInvoicedAmount)}</strong> was billed and{" "}
          <strong>{money(o.totalCollectedAmount)}</strong> collected, a collection rate of{" "}
          <strong>{pct(o.collectionRate)}</strong>, leaving <strong>{money(o.totalOverdueAmount)}</strong>{" "}
          outstanding. The helpdesk logged <strong>{o.totalTickets}</strong> tickets and closed{" "}
          <strong>{o.resolvedTicketsCount}</strong> of them ({pct(o.resolutionRate)}), averaging{" "}
          <strong>{o.avgResolutionHours} hours</strong> to resolve.
          {o.unresolvedUrgentTickets.length > 0 && (
            <>
              {" "}
              <strong>{o.unresolvedUrgentTickets.length}</strong> urgent or high-priority ticket
              {o.unresolvedUrgentTickets.length === 1 ? " remains" : "s remain"} open; see table 3.4.
            </>
          )}
        </p>

        <Caption>Table 1.1 — Key performance indicators</Caption>
        <Table head={["Indicator", "Value", "Basis"]} align="lrl">
          <Row c={["Total units", String(o.totalUnitsCount), "Units on record, excluding archived properties"]} />
          <Row c={["Occupied units", String(o.occupiedUnitsCount), "Unit status = Occupied"]} />
          <Row c={["Vacant units", String(o.vacantUnitsCount), "Unit status = Vacant"]} />
          <Row c={["Units under maintenance", String(o.maintenanceUnitsCount), "Unit status = Under Maintenance"]} />
          <Row c={["Occupancy rate", pct(o.occupancyRate), "Occupied ÷ total units"]} strong />
          <Row c={["Total billed", money(o.totalInvoicedAmount), "Invoices dated within the period"]} />
          <Row c={["Total collected", money(o.totalCollectedAmount), "Confirmed payments against those invoices"]} />
          <Row c={["Total outstanding", money(o.totalOverdueAmount), "Unpaid balance past its due date"]} />
          <Row c={["Collection rate", pct(o.collectionRate), "Collected ÷ billed"]} strong />
          <Row c={["Tickets logged", String(o.totalTickets), "Maintenance tickets created in the period"]} />
          <Row c={["Resolution rate", pct(o.resolutionRate), "Resolved or closed ÷ logged"]} strong />
          <Row c={["Average time to resolve", `${o.avgResolutionHours} hours`, "Created to resolved, resolved tickets only"]} />
          <Row c={["Visitor passes issued", String(o.totalVisitorsCount), "Visitor records created in the period"]} />
          <Row c={["Visitors currently inside", String(o.activeCheckedInCount), "Checked in with no check-out recorded"]} />
        </Table>
      </Section>

      {/* ---------------- 2. Financials ---------------- */}
      <Section n="2" title="Financials and billing">
        <Caption>Table 2.1 — Billing and collection summary</Caption>
        <Table head={["Measure", "Amount", "Share of billed"]}>
          <Row c={["Gross billed", money(f.totalInvoiced), "100%"]} />
          <Row
            c={[
              "Collected",
              money(f.totalCollected),
              f.totalInvoiced > 0 ? pct((f.totalCollected / f.totalInvoiced) * 100) : "—",
            ]}
          />
          <Row
            c={[
              "Outstanding past due",
              money(f.totalOverdue),
              f.totalInvoiced > 0 ? pct((f.totalOverdue / f.totalInvoiced) * 100) : "—",
            ]}
            strong
          />
        </Table>

        <Caption>Table 2.2 — Ageing of receivables</Caption>
        <Table head={["Age bracket", "Amount", "Share of arrears"]}>
          {[
            ["Current (0–30 days)", f.agingReceivables.current],
            ["31–60 days", f.agingReceivables.days30],
            ["61–90 days", f.agingReceivables.days60],
            ["Over 90 days", f.agingReceivables.days90Plus],
          ].map(([label, amt]) => (
            <Row
              key={label as string}
              c={[
                label as string,
                money(amt as number),
                agingTotal > 0 ? pct(((amt as number) / agingTotal) * 100) : "—",
              ]}
            />
          ))}
          <Row c={["Total arrears", money(agingTotal), "100%"]} strong />
        </Table>

        <Caption>Table 2.3 — Billed amount by charge type</Caption>
        <Table head={["Charge type", "Amount", "Share"]}>
          {f.chargeDistribution.length === 0 ? (
            <Empty cols={3} />
          ) : (
            f.chargeDistribution.map((c) => (
              <Row
                key={c.name}
                c={[c.name, money(c.value), chargeTotal > 0 ? pct((c.value / chargeTotal) * 100) : "—"]}
              />
            ))
          )}
          {f.chargeDistribution.length > 0 && <Row c={["Total", money(chargeTotal), "100%"]} strong />}
        </Table>

        <Caption>Table 2.4 — Accounts in arrears (highest ten)</Caption>
        <Table head={["Unit", "Resident", "Property", "Unpaid bills", "Days overdue", "Amount"]} align="lllrrr">
          {!f.topDefaulters?.length ? (
            <Empty cols={6} note="No unit is in arrears for this period." />
          ) : (
            f.topDefaulters.map((d) => (
              <Row
                key={`${d.propertyName}-${d.unitNumber}`}
                c={[
                  d.unitNumber,
                  d.tenantName,
                  d.propertyName,
                  String(d.unpaidInvoicesCount),
                  String(d.maxDaysOverdue),
                  money(d.overdueAmount),
                ]}
              />
            ))
          )}
        </Table>

        {f.trend.length > 0 && (
          <>
            <Caption>Table 2.5 — Billed against collected, by month</Caption>
            <Table head={["Month", "Billed", "Collected", "Collection rate"]}>
              {f.trend.map((t) => (
                <Row
                  key={t.month}
                  c={[
                    t.month,
                    money(t.invoiced),
                    money(t.collected),
                    t.invoiced > 0 ? pct((t.collected / t.invoiced) * 100) : "—",
                  ]}
                />
              ))}
            </Table>
          </>
        )}
      </Section>

      {/* ---------------- 3. Helpdesk ---------------- */}
      <Section n="3" title="Helpdesk and service levels">
        <Caption>Table 3.1 — Ticket summary</Caption>
        <Table head={["Measure", "Count", "Share of logged"]}>
          <Row c={["Tickets logged", String(m.totalTickets), "100%"]} />
          <Row
            c={[
              "Resolved or closed",
              String(m.resolvedCount),
              m.totalTickets > 0 ? pct((m.resolvedCount / m.totalTickets) * 100) : "—",
            ]}
          />
          <Row
            c={[
              "In progress",
              String(m.inProgressCount),
              m.totalTickets > 0 ? pct((m.inProgressCount / m.totalTickets) * 100) : "—",
            ]}
          />
          <Row
            c={[
              "Awaiting action",
              String(m.openCount),
              m.totalTickets > 0 ? pct((m.openCount / m.totalTickets) * 100) : "—",
            ]}
          />
          <Row c={["Resolution rate", pct(m.resolutionRate), "—"]} strong />
          <Row c={["Average time to resolve", `${m.avgResolutionHours} hours`, "—"]} strong />
        </Table>

        <Caption>Table 3.2 — Tickets by category</Caption>
        <Table head={["Category", "Logged", "Resolved", "Outstanding", "Resolution rate"]}>
          {m.categoryBreakdown.length === 0 ? (
            <Empty cols={5} />
          ) : (
            m.categoryBreakdown.map((c) => (
              <Row
                key={c.name}
                c={[
                  c.name,
                  String(c.total),
                  String(c.resolved),
                  String(c.total - c.resolved),
                  c.total > 0 ? pct((c.resolved / c.total) * 100) : "—",
                ]}
              />
            ))
          )}
        </Table>

        <Caption>Table 3.3 — Tickets by priority</Caption>
        <Table head={["Priority", "Count", "Share"]}>
          {m.priorityBreakdown.length === 0 ? (
            <Empty cols={3} />
          ) : (
            m.priorityBreakdown.map((p) => (
              <Row
                key={p.name}
                c={[p.name, String(p.value), m.totalTickets > 0 ? pct((p.value / m.totalTickets) * 100) : "—"]}
              />
            ))
          )}
        </Table>

        <Caption>Table 3.4 — Urgent and high-priority tickets still open (up to five)</Caption>
        <Table head={["Title", "Category", "Priority", "Location", "Status", "Raised"]} align="llllll">
          {!m.unresolvedUrgentTickets?.length ? (
            <Empty cols={6} note="No urgent or high-priority ticket is outstanding." />
          ) : (
            m.unresolvedUrgentTickets.map((t: any) => (
              <Row
                key={t.ticket_id}
                c={[
                  t.title ?? "—",
                  t.ticket_category ?? "—",
                  t.priority ?? "—",
                  t.unit?.unit_number ??
                    t.lease?.unit?.unit_number ??
                    t.location_detail ??
                    t.location_type ??
                    "—",
                  t.status ?? "—",
                  t.created_at ? docDate(t.created_at) : "—",
                ]}
              />
            ))
          )}
        </Table>
      </Section>

      {/* ---------------- 4. Facilities ---------------- */}
      <Section n="4" title="Facility bookings">
        <Caption>Table 4.1 — Booking summary</Caption>
        <Table head={["Measure", "Value"]} align="lr">
          <Row c={["Bookings made", String(fac.totalBookings)]} />
          <Row c={["Confirmed bookings", String(fac.confirmedCount)]} />
          <Row c={["Total hours booked", `${fac.totalHours} hours`]} />
          <Row
            c={[
              "Average hours per booking",
              fac.totalBookings > 0 ? `${(fac.totalHours / fac.totalBookings).toFixed(1)} hours` : "—",
            ]}
            strong
          />
        </Table>

        <Caption>Table 4.2 — Usage by amenity</Caption>
        <Table head={["Amenity", "Bookings", "Hours booked", "Share of hours"]}>
          {fac.amenityUsage.length === 0 ? (
            <Empty cols={4} />
          ) : (
            fac.amenityUsage.map((a) => (
              <Row
                key={a.name}
                c={[
                  a.name,
                  String(a.count),
                  String(a.hours),
                  fac.totalHours > 0 ? pct((a.hours / fac.totalHours) * 100) : "—",
                ]}
              />
            ))
          )}
        </Table>

        <Caption>Table 4.3 — Bookings by time of day</Caption>
        <Table head={["Time band", "Bookings", "Share"]}>
          {fac.timeSlotDistribution.map((s) => (
            <Row
              key={s.slot}
              c={[s.slot, String(s.count), fac.totalBookings > 0 ? pct((s.count / fac.totalBookings) * 100) : "—"]}
            />
          ))}
        </Table>

        <Caption>Table 4.4 — Most recent bookings (latest ten)</Caption>
        <Table head={["Date", "Amenity", "Unit", "Resident", "Time", "Status"]} align="llllll">
          {!fac.bookingsList?.length ? (
            <Empty cols={6} />
          ) : (
            fac.bookingsList.map((b: any) => (
              <Row
                key={b.booking_id}
                c={[
                  b.booking_date ? docDate(b.booking_date) : "—",
                  b.facility?.facility_name ?? "—",
                  b.lease?.unit?.unit_number ?? "—",
                  b.lease?.tenant?.user_name ?? "—",
                  `${b.start_time ?? "—"} – ${b.end_time ?? "—"}`,
                  b.booking_status ?? "—",
                ]}
              />
            ))
          )}
        </Table>
      </Section>

      {/* ---------------- 5. Visitors ---------------- */}
      <Section n="5" title="Visitors and security">
        <Caption>Table 5.1 — Visitor summary</Caption>
        <Table head={["Measure", "Count", "Share of passes"]}>
          <Row c={["Passes issued", String(v.totalVisitors), "100%"]} />
          <Row
            c={[
              "Checked out",
              String(v.checkedOutCount),
              v.totalVisitors > 0 ? pct((v.checkedOutCount / v.totalVisitors) * 100) : "—",
            ]}
          />
          <Row
            c={[
              "Currently inside",
              String(v.activeInside),
              v.totalVisitors > 0 ? pct((v.activeInside / v.totalVisitors) * 100) : "—",
            ]}
            strong
          />
        </Table>

        <Caption>Table 5.2 — Passes by visitor type</Caption>
        <Table head={["Visitor type", "Passes", "Share"]}>
          {v.typeDistribution.length === 0 ? (
            <Empty cols={3} />
          ) : (
            v.typeDistribution.map((t) => (
              <Row
                key={t.type}
                c={[t.type, String(t.count), v.totalVisitors > 0 ? pct((t.count / v.totalVisitors) * 100) : "—"]}
              />
            ))
          )}
        </Table>

        <Caption>Table 5.3 — Visitors on site at time of generation</Caption>
        <Table head={["Visitor", "Type", "IC / passport", "Vehicle", "Destination", "Checked in"]} align="llllll">
          {!v.activeVisitorsList?.length ? (
            <Empty cols={6} note="No visitor is on site." />
          ) : (
            v.activeVisitorsList.map((a: any) => (
              <Row
                key={a.visitor_id}
                c={[
                  a.visitor_name ?? "—",
                  a.visitor_type ?? "—",
                  a.visitor_ic_no || "Not recorded",
                  a.vehicle_plate || "—",
                  a.destination || a.lease?.unit?.unit_number || "—",
                  a.check_in_time
                    ? new Intl.DateTimeFormat("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kuala_Lumpur",
                      }).format(new Date(a.check_in_time))
                    : "—",
                ]}
              />
            ))
          )}
        </Table>
      </Section>

      {/* ---------------- 6. Basis of preparation ---------------- */}
      <Section n="6" title="Basis of preparation">
        <ol className="space-y-2 text-[12px] leading-relaxed text-slate-700">
          <li>
            <strong>6.1 Source.</strong> Every figure is read from the PropMate operational database at the
            moment of generation. Nothing is cached, keyed in or carried over from an earlier report, so two
            copies made on different days will differ.
          </li>
          <li>
            <strong>6.2 Period.</strong> Billing, ticket, booking and visitor figures count records created
            within {periodDates}. Occupancy and arrears are positions as at {docDate(now)}, not period
            activity, because a unit is either occupied or not on the day you ask.
          </li>
          <li>
            <strong>6.3 Scope.</strong> {scope}.{" "}
            {propertyId === "ALL"
              ? "Figures are summed across every property not archived; a per-property breakdown requires one report per property."
              : "Records belonging to other properties are excluded."}
          </li>
          <li>
            <strong>6.4 Currency.</strong> All amounts are in {settings.currency} and include any tax already
            applied on the invoice. Totals are rounded for presentation, so a column may differ from its
            components by a small amount.
          </li>
          <li>
            <strong>6.5 Collection rate.</strong> Confirmed payments divided by gross billed for the same
            period. A payment confirmed this period against an invoice billed earlier raises the rate above
            what was billed; a rate over 100% means arrears were cleared.
          </li>
          <li>
            <strong>6.6 Ageing.</strong> Brackets are counted from each invoice&apos;s due date to{" "}
            {docDate(now)}. An invoice awaiting verification of a payment proof is still counted as
            outstanding.
          </li>
          <li>
            <strong>6.7 Time to resolve.</strong> Elapsed clock hours from ticket creation to resolution, over
            resolved tickets only. It is not working hours and does not stop while a ticket waits for parts.
          </li>
          <li>
            <strong>6.8 Lists.</strong> Tables 2.4, 3.4, 4.4 and 5.3 show the ten highest or most recent
            records. A longer list is available from the Export CSV option on the Reports screen.
          </li>
          <li>
            <strong>6.9 Timezone.</strong> All dates and times are Malaysia time (MYT, UTC+8).
          </li>
        </ol>
      </Section>

      {/* ---------------- Sign-off ---------------- */}
      <section className="rpt-block mt-8 border-t-2 border-slate-900 pt-5">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Certification
        </h2>
        <div className="grid grid-cols-2 gap-8 text-[11.5px]">
          <div>
            <p className="font-semibold text-slate-500">Prepared by</p>
            <p className="mt-6 border-t border-slate-400 pt-1.5 font-semibold">{user.user_name}</p>
            <p className="text-slate-500">{user.role} · {docDate(now)}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-500">Reviewed and accepted by</p>
            <p className="mt-6 border-t border-slate-400 pt-1.5 text-slate-400">Name and designation</p>
            <p className="text-slate-500">Date</p>
          </div>
        </div>
        <p className="mt-6 text-[10.5px] leading-relaxed text-slate-500">
          {ref} · Generated from PropMate on {docDate(now)} by {user.user_name}. Internal — management use
          only. This report reflects the database at the time of generation and is superseded by any later
          copy.
          {settings.contact && <> {settings.contact}</>}
        </p>
      </section>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks, so every section is laid out the same way.  */
/* ------------------------------------------------------------------ */

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rpt-section mt-8">
      <h2 className="mb-3 flex items-baseline gap-2.5 border-b-2 border-slate-800 pb-1.5 text-[16px] font-black tracking-tight">
        <span className="tabular-nums text-slate-400">{n}</span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 mt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500 first:mt-0">
      {children}
    </p>
  );
}

/*
 * `align` is one character per column: "l" left, "r" right. Omitted, the first
 * column is left and the rest right, which is correct for a figures table and
 * wrong for a list - a right-aligned "Basis" or "Resident" column reads as a
 * ragged mess against the next one.
 */
const cellAlign = (align: string | undefined, i: number) => {
  const a = align ? align[i] : i === 0 ? "l" : "r";
  return a === "l" ? "text-left" : "text-right tabular-nums";
};

function Table({
  head,
  align,
  children,
}: {
  head: string[];
  align?: string;
  children: React.ReactNode;
}) {
  /* Hand `align` down so each Row doesn't have to repeat it. */
  const rows = Children.map(children, (child) =>
    isValidElement<{ align?: string }>(child) && child.props.align === undefined
      ? cloneElement(child, { align })
      : child
  );

  return (
    <table className="rpt-block mb-1 w-full border-collapse text-[11.5px]">
      <thead>
        <tr className="border-y-2 border-slate-800 bg-slate-100">
          {head.map((h, i) => (
            <th
              key={h}
              scope="col"
              className={`py-1.5 px-2 font-bold uppercase tracking-wide text-slate-600 ${cellAlign(align, i)}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

function Row({ c, align, strong = false }: { c: string[]; align?: string; strong?: boolean }) {
  return (
    <tr className={`border-b border-slate-200 ${strong ? "bg-slate-50 font-bold" : ""}`}>
      {c.map((cell, i) => (
        <td key={i} className={`py-1.5 px-2 align-top ${cellAlign(align, i)}`}>
          {cell}
        </td>
      ))}
    </tr>
  );
}

function Empty({ cols, note }: { cols: number; note?: string; align?: string }) {
  return (
    <tr className="border-b border-slate-200">
      <td colSpan={cols} className="py-2.5 px-2 text-center italic text-slate-500">
        {note ?? "No records for this period."}
      </td>
    </tr>
  );
}
