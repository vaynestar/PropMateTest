import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

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
    select: { total_amount: true, due_date: true },
    orderBy: { due_date: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const total = unpaid.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const overdue = unpaid.filter((i) => new Date(i.due_date) < today);
  const nextDue = unpaid.find((i) => new Date(i.due_date) >= today)?.due_date ?? null;

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

export async function getLatestAnnouncement(propertyId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.announcement.findFirst({
    where: {
      OR: [
        { property_id: propertyId },
        { property_id: null },
      ],
      status: "Published",
      expiry_date: { gte: today },
    },
    orderBy: [
      { is_pinned: "desc" },
      { priority: "desc" },
      { publish_date: "desc" },
    ],
  });
}
