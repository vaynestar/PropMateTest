import "server-only";
import prisma from "@/lib/prisma";
import { REMINDER_TYPES, stepFor, type ArrearsStep } from "@/lib/arrears-steps";

export * from "@/lib/arrears-steps";

/**
 * Arrears, per tenancy rather than per invoice (DEV-254).
 *
 * The Billing screen's "Chasing payment" table lists overdue INVOICES, so unit
 * A-12-11 with three unpaid months appears three times and the reader has to
 * add RM 5,000 + RM 5,000 + RM 2,800 in their head to learn what the unit
 * actually owes. Chasing is done per household — one call, one letter, one
 * conversation — so this groups by lease and sorts by the money.
 *
 * `history` is the column the screen exists for. At an AGM somebody always
 * asks whether a unit was ever warned, and today the only answer is somebody's
 * memory. Reminders are stored as `Notification` rows, which already exist and
 * already reach the resident, so no schema change was needed.
 */

export type ArrearsRow = {
  leaseId: string;
  unitNumber: string;
  unitId: string | null;
  tenantId: string | null;
  tenantName: string;
  contact: string;
  owed: number;
  invoiceCount: number;
  /** Days past due on the OLDEST unpaid invoice. */
  oldestDaysLate: number;
  oldestInvoiceNo: string;
  step: ArrearsStep;
  history: { at: Date; what: string }[];
};

const SETTLED = ["Paid", "Inactive"];

export async function getArrears(propertyId?: string): Promise<ArrearsRow[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = await prisma.invoice.findMany({
    where: {
      status: { notIn: SETTLED },
      due_date: { lt: today },
      ...(propertyId ? { lease: { unit: { property_id: propertyId } } } : {}),
    },
    include: {
      lease: {
        include: {
          unit: { select: { unit_id: true, unit_number: true } },
          tenant: { select: { user_id: true, user_name: true, user_email: true, phone_number: true } },
        },
      },
    },
    orderBy: { due_date: "asc" },
  });

  if (overdue.length === 0) return [];

  // One query for every reminder on every lease on screen, rather than one per
  // row — a 41-unit block would otherwise be 41 round trips.
  const leaseIds = [...new Set(overdue.map((i) => i.lease_id).filter(Boolean))] as string[];
  const reminders = await prisma.notification.findMany({
    where: { lease_id: { in: leaseIds }, notification_type: { in: [...REMINDER_TYPES] } },
    orderBy: { sent_at: "desc" },
    select: { lease_id: true, sent_at: true, title: true, notification_type: true },
  });

  const byLease = new Map<string, ArrearsRow>();

  for (const inv of overdue) {
    const leaseId = inv.lease_id;
    if (!leaseId) continue;
    const daysLate = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / 86_400_000);
    const existing = byLease.get(leaseId);

    if (existing) {
      existing.owed += Number(inv.total_amount ?? 0);
      existing.invoiceCount += 1;
      if (daysLate > existing.oldestDaysLate) {
        existing.oldestDaysLate = daysLate;
        existing.oldestInvoiceNo = inv.invoice_no;
      }
      continue;
    }

    const tenant = inv.lease?.tenant;
    byLease.set(leaseId, {
      leaseId,
      unitNumber: inv.lease?.unit?.unit_number ?? "—",
      unitId: inv.lease?.unit?.unit_id ?? null,
      tenantId: tenant?.user_id ?? null,
      tenantName: tenant?.user_name ?? "No tenant on the lease",
      contact: [tenant?.phone_number, tenant?.user_email].filter(Boolean).join(" · ") || "No contact on file",
      owed: Number(inv.total_amount ?? 0),
      invoiceCount: 1,
      oldestDaysLate: daysLate,
      oldestInvoiceNo: inv.invoice_no,
      step: "late",
      history: [],
    });
  }

  for (const row of byLease.values()) {
    row.step = stepFor(row.oldestDaysLate);
    row.history = reminders
      .filter((r) => r.lease_id === row.leaseId)
      .slice(0, 4)
      .map((r) => ({
        at: r.sent_at,
        what: r.notification_type === "PAYMENT_FINAL_NOTICE" ? "Final notice sent" : "Reminder sent",
      }));
  }

  // Biggest debt first. Oldest-first sounds fairer but buries a RM 12,000
  // three-month arrear under a RM 180 one that happens to be a day older.
  return [...byLease.values()].sort((a, b) => b.owed - a.owed);
}
