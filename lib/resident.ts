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
      invoices: { orderBy: { invoice_date: "desc" }, take: 5 },
      tickets: { orderBy: { created_at: "desc" }, take: 5 },
    },
  });

  return { lease };
}

export async function getResidentInvoices(userId: string) {
  return prisma.invoice.findMany({
    orderBy: { invoice_date: "desc" },
    where: { lease: { tenant: { user_id: userId } } },
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
