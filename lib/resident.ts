import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { dateKeyMY, invoiceState, todayKeyMY } from "@/lib/invoice-state";

export type ResidentPortalData = {
  lease: Prisma.TenantLeaseGetPayload<{
    include: {
      unit: { include: { property: true } };
      invoices: { orderBy: { invoice_date: "desc" }; take: 5 };
      tickets: { orderBy: { created_at: "desc" }; take: 5 };
    };
  }> | null;
};

export async function getResidentPortalData(
  userId: string
): Promise<ResidentPortalData> {
  const lease = await prisma.tenantLease.findFirst({
    where: { user_id: userId, status: "Active" },
    orderBy: ACTIVE_LEASE_ORDER,
    include: {
      unit: { include: { property: true } },
      // Drafts are the admin's working copy - editable, not yet sent (DEV-140).
      // A resident must never be billed from one, so issued invoices only.
      invoices: {
        where: { issued_at: { not: null } },
        orderBy: { invoice_date: "desc" },
        take: 5,
      },
      tickets: { orderBy: { created_at: "desc" }, take: 5 },
    },
  });

  return { lease };
}

/**
 * What the resident still owes, for the home screen.
 *
 * The dashboard summed `status !== "Paid"` over the lease's latest 5 invoices,
 * so it counted Voided invoices as owed and silently dropped anything older
 * than the fifth - the resident review's D-12. This totals every issued,
 * unpaid invoice across the resident's active leases.
 */
export async function getResidentOutstanding(userId: string) {
  const unpaid = await prisma.invoice.findMany({
    where: {
      lease: { user_id: userId, status: "Active" },
      issued_at: { not: null },
      status: "Unpaid",
    },
    select: {
      total_amount: true,
      due_date: true,
      // An invoice whose proof the office is still checking was counted as
      // overdue here while the invoices list called it "Being checked" (R17).
      transactions: {
        where: { payment_method: "Bank transfer", transaction_status: "Pending" },
        select: { transaction_id: true },
        take: 1,
      },
    },
    orderBy: { due_date: "asc" },
  });

  const todayKey = todayKeyMY();
  const total = unpaid.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const overdue = unpaid.filter(
    (i) => invoiceState({ status: "Unpaid", due_date: i.due_date }, i.transactions.length > 0, todayKey) === "overdue"
  );
  const nextDue = unpaid.find((i) => dateKeyMY(i.due_date) >= todayKey)?.due_date ?? null;

  return {
    total,
    invoiceCount: unpaid.length,
    overdueCount: overdue.length,
    overdueTotal: overdue.reduce((sum, i) => sum + Number(i.total_amount), 0),
    nextDue,
  };
}

export async function getResidentInvoices(userId: string) {
  return prisma.invoice.findMany({
    orderBy: { invoice_date: "desc" },
    // Issued only. Before F7 this returned Drafts too, so a figure an admin
    // was still correcting showed on the resident's Invoices page as a bill.
    where: { lease: { tenant: { user_id: userId } }, issued_at: { not: null } },
    include: {
      lease: { include: { unit: true } },
      details: { include: { charge: true } },
    },
  });
}

export async function getResidentTickets(userId: string) {
  return prisma.ticket.findMany({
    orderBy: { created_at: "desc" },
    where: {
      OR: [
        { requester_id: userId },
        { lease: { tenant: { user_id: userId } } },
      ],
    },
    include: {
      property: true,
      unit: true,
      lease: { include: { unit: true } },
      attachments: { select: { attachment_id: true, file_name: true, comment_id: true }, orderBy: { created_at: "asc" } },
      _count: { select: { comments: true } },
    },
  });
}

export async function getResidentBookings(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.booking.findMany({
    where: {
      user_id: userId,
      booking_date: { gte: today },
      booking_status: { not: "Cancelled" },
    },
    orderBy: [{ booking_date: "asc" }, { start_time: "asc" }],
    include: { facility: { include: { property: true } } },
    take: 10,
  });
}

/**
 * The one notice the dashboard card shows.
 *
 * Two things were wrong (R14). `publish_date` was not checked, so a notice
 * written today to go up next Tuesday appeared on the card at once - the same
 * bug the notice board itself had. And `priority: "desc"` sorts the column as
 * text, which puts Urgent first but then Normal above High. Ranked here
 * instead, on the handful of candidates.
 */
const NOTICE_RANK: Record<string, number> = { Urgent: 3, High: 2, Normal: 1, Low: 0 };

export async function getLatestAnnouncement(propertyId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = await prisma.announcement.findMany({
    where: {
      OR: [{ property_id: propertyId }, { property_id: null }],
      status: "Published",
      publish_date: { lte: today },
      expiry_date: { gte: today },
    },
    orderBy: [{ is_pinned: "desc" }, { publish_date: "desc" }],
    take: 20,
  });

  return (
    candidates.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const rank = (NOTICE_RANK[b.priority] ?? 0) - (NOTICE_RANK[a.priority] ?? 0);
      if (rank !== 0) return rank;
      return b.publish_date.getTime() - a.publish_date.getTime();
    })[0] ?? null
  );
}

/**
 * Which tenancy is "theirs", when a resident has more than one active lease.
 *
 * Seven places asked `tenantLease.findFirst({ where: { user_id, status } })`
 * with no ordering, so Postgres was free to answer differently each time: the
 * dashboard could show one unit and the booking form scope to another
 * (R23/D-40). Three of the eight residents in the staging data hold two active
 * leases, so this is not hypothetical.
 *
 * The newest tenancy wins, with the id as a tie-break so the answer is stable.
 */
export const ACTIVE_LEASE_ORDER: Prisma.TenantLeaseOrderByWithRelationInput[] = [
  { move_in_date: "desc" },
  { lease_id: "asc" },
];
