import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUnitFile } from "@/lib/unit-file";
import { BTN, Money, PageHeader, SectionCard, TABLE } from "@/components/admin/ui";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { dayMonth } from "@/lib/short-date";
import UnitFileActions from "@/components/units/UnitFileActions";

export const dynamic = "force-dynamic";

const TONE_DOT: Record<string, string> = {
  primary: "bg-primary",
  positive: "bg-emerald-400",
  critical: "bg-rose-400",
  neutral: "bg-slate-400",
};

function longDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

function longDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

/**
 * The unit file (DEV-263) — the page that did not exist.
 *
 * A unit's money lived in Invoices, its repairs in Helpdesk, its bookings in
 * Bookings, its guests in Visitors. When a resident telephoned about A-12-11
 * the office opened four screens and held the fourth in its head. This is
 * all of it on one page, with two things PropMate has never had: a ledger
 * with a running balance, and a record of who changed what.
 */
export default async function UnitFilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["Admin"]);
  const { id } = await params;
  const file = await getUnitFile(id);
  if (!file) notFound();

  const { unit, lease, ledger, owed, history, billedMonthly, counts } = file;

  const facts = [
    {
      label: "Resident",
      value: lease?.tenant?.user_name ?? "Nobody",
      note: lease
        ? `since ${longDate(lease.move_in_date)}${lease.tenant?.phone_number ? ` · ${lease.tenant.phone_number}` : ""}`
        : "No tenancy on this unit",
      critical: false,
    },
    {
      label: "Owes",
      value: owed > 0 ? <Money value={owed} /> : "Nothing",
      note:
        counts.unpaidCount > 0
          ? `${counts.unpaidCount} bill${counts.unpaidCount === 1 ? "" : "s"} outstanding`
          : `${counts.invoiceCount} invoice${counts.invoiceCount === 1 ? "" : "s"}, all settled`,
      critical: owed > 0,
    },
    {
      label: "Open repairs",
      value: String(counts.openRepairs),
      note: `${counts.allRepairs} all time`,
      critical: false,
    },
    {
      label: "Billed monthly",
      value: billedMonthly > 0 ? <Money value={billedMonthly} /> : "Nothing",
      note:
        lease && lease.chargeCount > 0
          ? `${lease.chargeCount} charge${lease.chargeCount === 1 ? "" : "s"} attached`
          : lease
          ? "No charges set — this tenancy bills nothing"
          : "No tenancy",
      critical: !!lease && billedMonthly <= 0,
    },
  ];

  const related = [
    { label: "Repairs", value: `${counts.openRepairs} open · ${counts.allRepairs} all time`, href: "/admin/maintenance" },
    { label: "Facility bookings", value: `${counts.bookingsThisMonth} this month`, href: "/admin/bookings" },
    { label: "Visitors registered", value: `${counts.visitorsThisMonth} this month`, href: "/admin/visitors" },
    {
      label: "Payment slips sent",
      value: `${counts.slipsSent}${counts.slipsWaiting ? ` · ${counts.slipsWaiting} waiting` : ""}`,
      href: "/admin/invoices",
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/admin/units"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Units
      </Link>

      <PageHeader
        title={unit.unit_number}
        subtitle={[
          unit.unit_type,
          unit.area_sqft ? `${unit.area_sqft.toLocaleString("en-MY")} sq ft` : null,
          `Floor ${unit.floor_number}`,
          unit.property?.property_name,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <StatusBadge status={unit.status} variant="unit" />
            {lease && (
              <Link href={`/admin/leases/${lease.lease_id}/charges`} className={BTN.secondary}>
                What it is billed
              </Link>
            )}
            {owed > 0 && (
              <Link href="/admin/billing/arrears" className={BTN.primary}>
                Chase this
              </Link>
            )}
            <UnitFileActions
              unitId={unit.unit_id}
              unitNumber={unit.unit_number}
              hasActiveLease={!!lease}
              invoiceCount={counts.invoiceCount}
              repairCount={counts.allRepairs}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {facts.map((f) => (
          <div
            key={f.label}
            className={`rounded-xl border p-4 ${
              f.critical ? "border-rose-500/45 bg-rose-500/[0.06]" : "border-outline-variant/60 bg-surface-container"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{f.label}</p>
            <p
              className={`mt-2 text-[20px] font-extrabold leading-6 tabular-nums ${
                f.critical ? "text-rose-200" : "text-white"
              }`}
            >
              {f.value}
            </p>
            <p className={`mt-1 text-[11px] ${f.critical ? "text-rose-300" : "text-on-surface-variant"}`}>{f.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionCard
            title="Account ledger"
            subtitle="Every charge and payment, with the running balance."
            padded={false}
          >
            <div className={TABLE.wrap}>
              <table className={TABLE.table}>
                <caption className="sr-only">Ledger for unit {unit.unit_number}</caption>
                <thead>
                  <tr>
                    <th className={TABLE.th}>Date</th>
                    <th className={TABLE.th}>What</th>
                    <th className={TABLE.thNum}>Charged</th>
                    <th className={TABLE.thNum}>Paid</th>
                    <th className={TABLE.thNum}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                        Nothing has been charged against this unit yet.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((l, i) => (
                      <tr
                        key={`${l.what}-${i}`}
                        className={
                          TABLE.tr +
                          (l.kind === "pending"
                            ? " bg-amber-500/[0.055]"
                            : l.kind === "payment"
                            ? " bg-emerald-500/[0.05]"
                            : "")
                        }
                      >
                        <td className={TABLE.td + " whitespace-nowrap tabular-nums text-on-surface-variant"}>
                          {longDate(l.at)}
                        </td>
                        <td className={TABLE.td}>
                          <span
                            className={`font-semibold ${
                              l.kind === "payment"
                                ? "text-emerald-300"
                                : l.kind === "pending"
                                ? "text-amber-200"
                                : "text-on-surface"
                            }`}
                          >
                            {l.href ? (
                              <Link href={l.href} className="hover:underline">
                                {l.what}
                              </Link>
                            ) : (
                              l.what
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-on-surface-variant">{l.sub}</span>
                        </td>
                        <td className={TABLE.tdNum + " whitespace-nowrap"}>
                          {l.charged > 0 ? <Money value={l.charged} /> : <span className="text-on-surface-variant/40">—</span>}
                        </td>
                        <td className={TABLE.tdNum + " whitespace-nowrap text-emerald-300"}>
                          {l.paid > 0 ? <Money value={l.paid} /> : <span className="text-on-surface-variant/40">—</span>}
                        </td>
                        <td className={TABLE.tdNum + " whitespace-nowrap font-bold"}>
                          <Money value={l.balance} />
                        </td>
                      </tr>
                    ))
                  )}
                  {ledger.length > 0 && (
                    <tr className="border-t-2 border-outline-variant bg-surface-container-high">
                      <td colSpan={4} className="px-4 py-3 font-extrabold text-on-surface">
                        Owed today
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-extrabold tabular-nums ${
                          owed > 0 ? "text-rose-300" : "text-emerald-300"
                        }`}
                      >
                        <Money value={owed} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="min-w-0 space-y-5">
          {/* Collected on every row since the first commit, shown nowhere. */}
          <SectionCard
            title="Who changed what"
            subtitle="Read back from the audit columns every table already carries."
            padded={false}
          >
            {history.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-on-surface-variant">
                Nothing has been changed on this unit since it was created.
              </p>
            ) : (
              <ol className="flex flex-col gap-3 px-4 py-3">
                {history.slice(0, 8).map((h, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${TONE_DOT[h.tone]}`} />
                    <span className="min-w-0 text-xs leading-relaxed">
                      <strong className="text-on-surface">{h.who}</strong>{" "}
                      <span className="text-on-surface-variant">{h.what}</span>
                      <span className="mt-0.5 block text-[11px] text-on-surface-variant/70">
                        {longDateTime(h.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="Everything else against this unit" padded={false}>
            <ul className="divide-y divide-outline-variant/30 px-4">
              {related.map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="text-on-surface-variant">{r.label}</span>
                  <Link href={r.href} className="font-semibold text-primary hover:underline">
                    {r.value}
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="The tenancy">
            {lease ? (
              <dl className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Started</dt>
                  <dd className="font-semibold text-on-surface">{longDate(lease.move_in_date)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Ends</dt>
                  <dd className="font-semibold text-on-surface">
                    {lease.move_out_date ? longDate(lease.move_out_date) : "no end date"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Status</dt>
                  <dd className="font-semibold text-on-surface">{lease.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Charges attached</dt>
                  <dd className="font-semibold text-on-surface">{lease.chargeCount}</dd>
                </div>
                {lease.tenant?.user_email && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-on-surface-variant">Contact</dt>
                    <dd className="truncate font-semibold text-on-surface">{lease.tenant.user_email}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-xs leading-relaxed text-on-surface-variant">
                Nobody is living here. A unit with no tenancy bills nothing and appears as vacant in every
                report.
              </p>
            )}
            <Link
              href={lease ? `/admin/leases?tenant=${lease.tenant?.user_id ?? ""}` : "/admin/leases"}
              className={BTN.secondary + " mt-3 w-full justify-center"}
            >
              {lease ? "Open the tenancy" : "Start a tenancy"}
            </Link>
          </SectionCard>
        </div>
      </div>

      {unit.status_remark && (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-200">
          <span className="font-bold">Note on this unit:</span> {unit.status_remark}
        </p>
      )}

      {history[0] && (
        <p className="text-[11px] text-on-surface-variant">
          Last touched {dayMonth(history[0].at, true)}.
        </p>
      )}
    </div>
  );
}
