import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getArrears } from "@/lib/arrears";
import { getActivePropertyId } from "@/lib/property-context.server";
import prisma from "@/lib/prisma";
import { BTN, Money, PageHeader } from "@/components/admin/ui";
import ArrearsClient, { type ArrearsRowView } from "@/components/billing/ArrearsClient";
import RefreshButton from "@/components/admin/RefreshButton";

export const dynamic = "force-dynamic";

/**
 * Chasing payment (DEV-254).
 *
 * This is the one genuinely new screen in the rebuild, and the case for it is
 * in the audit: PropMate could already say who owed what and for how long —
 * the Billing page's "Chasing payment" table — but every row was read-only, so
 * the system measured arrears without being able to chase them.
 *
 * Three things it does that the old table could not:
 *   · groups by TENANCY, so a unit with three unpaid months is one row with
 *     one total rather than three rows the reader has to add up;
 *   · shows the escalation step each unit has reached, which is the structure
 *     a strata office actually works to;
 *   · shows WHAT HAS ALREADY BEEN DONE, read back from the reminders it sends.
 *     At an AGM somebody always asks whether unit A-12-11 was ever warned, and
 *     until now the only answer was somebody's memory.
 */
export default async function ArrearsPage() {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? undefined;

  const [rows, property] = await Promise.all([
    getArrears(propertyId),
    propertyId
      ? prisma.propertyMaster.findUnique({
          where: { property_id: propertyId },
          select: { property_name: true },
        })
      : null,
  ]);

  const total = rows.reduce((sum, r) => sum + r.owed, 0);

  // Rule 6: Decimal is already converted in getArrears, but Date is not
  // serialisable across the boundary in a way the client can format, so the
  // history timestamps go over as ISO strings.
  const view: ArrearsRowView[] = rows.map((r) => ({
    leaseId: r.leaseId,
    unitNumber: r.unitNumber,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    contact: r.contact,
    owed: r.owed,
    invoiceCount: r.invoiceCount,
    oldestDaysLate: r.oldestDaysLate,
    oldestInvoiceNo: r.oldestInvoiceNo,
    step: r.step,
    history: r.history.map((h) => ({ at: h.at.toISOString(), what: h.what })),
  }));

  const asAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Chasing payment"
        subtitle={
          rows.length === 0
            ? `${property?.property_name ?? "This property"} — nothing is overdue as at ${asAt}.`
            : `RM ${total.toLocaleString("en-MY", { minimumFractionDigits: 2 })} owed across ${
                rows.length
              } unit${rows.length === 1 ? "" : "s"} · as at ${asAt}`
        }
        actions={
          <>
            <Link href="/print/report/aged-receivables" target="_blank" className={BTN.secondary}>
              Print the arrears report
            </Link>
            <Link href="/admin/invoices" className={BTN.secondary}>
              All invoices
            </Link>
            <RefreshButton title="Re-read what is owed from the server" />
          </>
        }
      />

      <ArrearsClient rows={view} />

      {rows.length > 0 && (
        <p className="text-xs leading-relaxed text-on-surface-variant">
          A reminder appears in the resident&rsquo;s app and is recorded against the tenancy, so the history
          above survives a change of staff. No email is sent — PropMate has no mail transport, and a screen
          that said &ldquo;emailed&rdquo; would be promising something the code does not do. Total shown:{" "}
          <Money value={total} className="font-semibold text-on-surface" />.
        </p>
      )}
    </div>
  );
}
