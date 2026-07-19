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
    where: { lease: { tenant: { user_id: userId } } },
    include: { lease: { include: { unit: true } } },
  });
}
