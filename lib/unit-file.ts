import "server-only";
import prisma from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/ticket-states";

/**
 * Everything about one unit, in one query set (DEV-263).
 *
 * **There was no page for a unit.** A unit's money lived in Invoices, its
 * repairs in Helpdesk, its bookings in Bookings, its guests in Visitors. When
 * a resident telephoned about A-12-11 the office opened four screens and held
 * the fourth in its head.
 *
 * Two things here exist nowhere else in PropMate:
 *
 *   · **the ledger** — every charge and every payment in date order with a
 *     running balance. It is what a strata office is asked for at the
 *     counter, by the auditor and at the AGM, and the one document that
 *     settles an argument;
 *   · **who changed what** — assembled from `created_by`, `modified_by` and
 *     `modified_at`, which every table has carried since the first commit
 *     and **nothing has ever shown**.
 */

export type LedgerRow = {
  at: Date;
  kind: "charge" | "payment" | "pending";
  what: string;
  sub: string;
  charged: number;
  paid: number;
  balance: number;
  href?: string;
};

export type HistoryRow = { at: Date; who: string; what: string; tone: "primary" | "positive" | "critical" | "neutral" };

export async function getUnitFile(unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { unit_id: unitId },
    include: {
      property: { select: { property_id: true, property_name: true } },
      modifier: { select: { user_name: true } },
      leases: {
        orderBy: { move_in_date: "desc" },
        include: {
          tenant: { select: { user_id: true, user_name: true, user_email: true, phone_number: true } },
          creator: { select: { user_name: true } },
          lease_charges: {
            include: {
              charge: { select: { charge_name: true } },
              modifier: { select: { user_name: true } },
            },
          },
        },
      },
    },
  });
  if (!unit) return null;

  const leaseIds = unit.leases.map((l) => l.lease_id);
  const activeLease = unit.leases.find((l) => l.status === "Active") ?? null;

  const [invoices, tickets, bookings, visitors] = await Promise.all([
    leaseIds.length
      ? prisma.invoice.findMany({
          where: { lease_id: { in: leaseIds } },
          orderBy: { invoice_date: "asc" },
          include: {
            details: { include: { charge: { select: { charge_name: true } } } },
            transactions: {
              orderBy: { created_at: "asc" },
              include: { modifier: { select: { user_name: true } } },
            },
          },
        })
      : [],
    prisma.ticket.findMany({
      where: { unit_id: unitId },
      select: { ticket_id: true, status: true },
    }),
    leaseIds.length
      ? prisma.booking.count({
          where: {
            lease_id: { in: leaseIds },
            booking_date: { gte: startOfMonth() },
          },
        })
      : 0,
    leaseIds.length
      ? prisma.visitor.count({
          where: { lease_id: { in: leaseIds }, created_at: { gte: startOfMonth() } },
        })
      : 0,
  ]);

  /* ------------------------------------------------------------------ *
   * The ledger
   * ------------------------------------------------------------------ */
  const events: Omit<LedgerRow, "balance">[] = [];

  for (const inv of invoices) {
    // A voided invoice never charged anybody, so it does not belong on a
    // running balance — but leaving it out silently would make the ledger
    // disagree with the invoice list, so it is listed at zero.
    const voided = inv.status === "Inactive";
    const lines = inv.details.map((d) => d.charge?.charge_name).filter(Boolean);
    events.push({
      at: new Date(inv.invoice_date),
      kind: "charge",
      what: inv.invoice_no,
      sub: voided
        ? "Voided — no longer charged"
        : lines.length
        ? lines.join(", ")
        : "Monthly charges",
      charged: voided ? 0 : Number(inv.total_amount ?? 0),
      paid: 0,
      href: `/admin/invoices?lease=${inv.lease_id}`,
    });

    /*
     * An invoice can be settled without a transaction behind it: an admin
     * marking it Paid by hand writes no PaymentTransaction row. Without this
     * the ledger charged RM 2,800 and never credited it, so the unit file
     * said RM 27,830 owed where the invoice list said RM 25,030 — and a
     * ledger that disagrees with the invoice list is worse than no ledger.
     */
    const credited = inv.transactions
      .filter((t) => t.transaction_status === "Success")
      .reduce((sum, t) => sum + Number(t.transaction_amount ?? 0), 0);
    const total = Number(inv.total_amount ?? 0);
    if (!voided && inv.status === "Paid" && credited + 0.005 < total) {
      events.push({
        at: new Date(inv.modified_at ?? inv.invoice_date),
        kind: "payment",
        what: "Marked settled by the office",
        sub: `${inv.invoice_no} · recorded without a bank-in slip`,
        charged: 0,
        paid: total - credited,
      });
    }

    for (const tx of inv.transactions) {
      if (tx.transaction_status === "Success") {
        events.push({
          at: new Date(tx.reviewed_at ?? tx.payment_date ?? tx.created_at),
          kind: "payment",
          what: "Payment received",
          sub: [tx.payment_method, tx.reference_number ? `ref ${tx.reference_number}` : null]
            .filter(Boolean)
            .join(" · "),
          charged: 0,
          paid: Number(tx.transaction_amount ?? 0),
        });
      } else if (tx.transaction_status === "Pending") {
        // It moves no money yet, so it carries the balance forward unchanged —
        // but an office looking at a balance needs to know a slip is sitting
        // on it, otherwise the figure looks ignored.
        events.push({
          at: new Date(tx.created_at),
          kind: "pending",
          what: "Slip waiting to be checked",
          sub: [
            `RM ${Number(tx.transaction_amount ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}`,
            tx.reference_number ? `ref ${tx.reference_number}` : null,
            "sent by the resident",
          ]
            .filter(Boolean)
            .join(" · "),
          charged: 0,
          paid: 0,
        });
      }
    }
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  let running = 0;
  const ledger: LedgerRow[] = events.map((e) => {
    running += e.charged - e.paid;
    return { ...e, balance: running };
  });
  const owed = running;

  /* ------------------------------------------------------------------ *
   * Who changed what
   * ------------------------------------------------------------------ */
  const history: HistoryRow[] = [];

  for (const l of unit.leases) {
    history.push({
      at: new Date(l.created_at),
      who: l.creator?.user_name ?? "Someone",
      what: `started the tenancy for ${l.tenant?.user_name ?? "a resident"}`,
      tone: "neutral",
    });

    for (const c of l.lease_charges) {
      // created_at and modified_at are equal on a row nobody has touched
      // since, so only a real edit is worth a line.
      if (Math.abs(+c.modified_at - +c.created_at) < 1000) continue;
      history.push({
        at: new Date(c.modified_at),
        who: c.modifier?.user_name ?? "Someone",
        what: `changed ${c.charge?.charge_name ?? "a charge"} to RM ${Number(c.amount ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}${
          c.is_active ? "" : ", and switched it off"
        }`,
        tone: "primary",
      });
    }
  }

  for (const inv of invoices) {
    for (const tx of inv.transactions) {
      if (!tx.reviewed_at) continue;
      const amount = `RM ${Number(tx.transaction_amount ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
      history.push({
        at: new Date(tx.reviewed_at),
        who: tx.modifier?.user_name ?? "Someone",
        what:
          tx.transaction_status === "Success"
            ? `accepted a bank-in slip of ${amount} against ${inv.invoice_no}`
            : `rejected a slip${tx.review_note ? ` — “${tx.review_note}”` : ""}`,
        tone: tx.transaction_status === "Success" ? "positive" : "critical",
      });
    }
  }

  if (unit.modified_by && Math.abs(+unit.modified_at - +unit.created_at) > 1000) {
    history.push({
      at: new Date(unit.modified_at),
      who: unit.modifier?.user_name ?? "Someone",
      what: `last edited this unit — it is ${unit.status.toLowerCase()}`,
      tone: "neutral",
    });
  }

  history.sort((a, b) => b.at.getTime() - a.at.getTime());

  /* ------------------------------------------------------------------ */
  const openRepairs = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;
  const slips = invoices.flatMap((i) => i.transactions);
  const billedMonthly = activeLease
    ? activeLease.lease_charges
        .filter((c) => c.is_active)
        .reduce((sum, c) => sum + Number(c.amount ?? 0) * Number(c.quantity ?? 1), 0) ||
      Number(unit.monthly_rent ?? 0)
    : 0;

  return {
    unit: {
      unit_id: unit.unit_id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
      floor_number: unit.floor_number,
      // Rule 6.
      area_sqft: Number(unit.area_sqft ?? 0),
      monthly_rent: Number(unit.monthly_rent ?? 0),
      status: unit.status,
      status_remark: (unit as { status_remark?: string | null }).status_remark ?? null,
      property: unit.property,
    },
    lease: activeLease
      ? {
          lease_id: activeLease.lease_id,
          status: activeLease.status,
          move_in_date: activeLease.move_in_date,
          move_out_date: activeLease.move_out_date,
          chargeCount: activeLease.lease_charges.filter((c) => c.is_active).length,
          tenant: activeLease.tenant,
        }
      : null,
    ledger,
    owed,
    history,
    billedMonthly,
    counts: {
      openRepairs,
      allRepairs: tickets.length,
      bookingsThisMonth: bookings,
      visitorsThisMonth: visitors,
      slipsSent: slips.length,
      slipsWaiting: slips.filter((t) => t.transaction_status === "Pending").length,
      invoiceCount: invoices.filter((i) => i.status !== "Inactive").length,
      unpaidCount: invoices.filter((i) => i.status !== "Paid" && i.status !== "Inactive").length,
    },
  };
}

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
