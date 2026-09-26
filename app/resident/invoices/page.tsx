import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { MANUAL_METHOD } from "@/lib/payment/payments";
import ResidentInvoiceList, { type ResidentInvoiceRow } from "@/components/billing/ResidentInvoiceList";
import { rm } from "@/lib/money";
import { invoiceState, todayKeyMY, daysLate as lateBy } from "@/lib/invoice-state";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Malaysia-date parts - the server runs in UTC. */
function myParts(d: Date) {
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(d).split("-").map(Number);
  return { y, m, day };
}


export default async function ResidentInvoicesPage() {
  const user = await getSessionUser();

  // Only what the list shows (the old query also pulled every line item and
  // charge for every invoice - work the page never used).
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoice_date: "desc" },
    // Issued only (F7): drafts are the admin's working copy.
    where: { lease: { tenant: { user_id: user!.userId } }, issued_at: { not: null } },
    select: {
      invoice_id: true,
      invoice_no: true,
      invoice_date: true,
      due_date: true,
      total_amount: true,
      status: true,
      lease: { select: { unit: { select: { unit_number: true } } } },
      transactions: {
        where: { payment_method: MANUAL_METHOD, transaction_status: "Pending" },
        select: { transaction_id: true },
        take: 1,
      },
    },
  });

  const todayKey = todayKeyMY();

  let outstanding = 0;
  let overdueCount = 0;
  const rows: ResidentInvoiceRow[] = invoices.map((inv) => {
    const period = myParts(new Date(inv.invoice_date));
    const due = myParts(new Date(inv.due_date));
    const amount = Number(inv.total_amount);
    // One rule for every screen - see lib/invoice-state.ts (R17).
    const state = invoiceState(inv, inv.transactions.length > 0, todayKey);
    if (state === "unpaid" || state === "checking" || state === "overdue") outstanding += amount;
    if (state === "overdue") overdueCount++;
    const daysLate = state === "overdue" ? lateBy(inv.due_date, todayKey) : 0;
    return {
      id: inv.invoice_id,
      invoiceNo: inv.invoice_no,
      period: `${MONTHS[period.m - 1]} ${period.y}`,
      amount: rm(amount),
      due: `${due.day} ${MONTHS[due.m - 1]} ${due.y}`,
      unit: inv.lease.unit.unit_number,
      state,
      daysLate,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[26px]">receipt_long</span>
          My Invoices
        </h1>
        <p className="text-sm text-on-surface-variant">Your bills, what&apos;s due, and what you&apos;ve paid.</p>
      </section>

      <section
        className={`rounded-2xl p-4 border flex items-center justify-between gap-3 ${
          overdueCount > 0
            ? "border-rose-500/40 bg-gradient-to-br from-rose-950/60 to-surface-container"
            : "border-primary/30 bg-gradient-to-br from-primary/15 to-surface-container"
        }`}
      >
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-on-surface-variant">Outstanding</p>
          <p className="text-2xl font-bold text-on-surface tabular-nums whitespace-nowrap">{rm(outstanding)}</p>
        </div>
        {overdueCount > 0 ? (
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border bg-rose-500/20 text-rose-200 border-rose-400/50 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {overdueCount} overdue
          </span>
        ) : (
          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-500/15 text-emerald-200 border-emerald-400/40 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Nothing overdue
          </span>
        )}
      </section>

      <ResidentInvoiceList rows={rows} />
    </div>
  );
}
