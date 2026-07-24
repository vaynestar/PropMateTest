import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    lease: { include: { unit: { include: { property: true } }; tenant: true } };
    details: { include: { charge: true } };
    modifier: { select: { user_name: true; user_email: true } };
    creator: { select: { user_name: true } };
  };
}>;

function currentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  return { y, m };
}

function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function listInvoices(propertyId?: string): Promise<InvoiceWithRelations[]> {
  return prisma.invoice.findMany({
    where: propertyId ? { lease: { unit: { property_id: propertyId } } } : undefined,
    orderBy: { invoice_date: "desc" },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
      details: { include: { charge: true } },
      modifier: { select: { user_name: true, user_email: true } },
      creator: { select: { user_name: true } },
    },
  });
}

export async function getInvoiceById(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { invoice_id: invoiceId },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
      details: { include: { charge: true } },
      modifier: { select: { user_name: true, user_email: true } },
      creator: { select: { user_name: true } },
    },
  });
}

export async function getRecentInvoices(propertyId?: string, limit = 5): Promise<InvoiceWithRelations[]> {
  return prisma.invoice.findMany({
    where: propertyId ? { lease: { unit: { property_id: propertyId } } } : undefined,
    orderBy: { invoice_date: "desc" },
    take: limit,
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
      details: { include: { charge: true } },
    },
  });
}

export async function getEligibleLeasesForInvoicing(targetDate = new Date()) {
  const d = new Date(targetDate);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);

  const leases = await prisma.tenantLease.findMany({
    where: { status: "Active" },
    include: {
      unit: { include: { property: true } },
      tenant: true,
      invoices: {
        where: {
          invoice_date: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        select: { invoice_id: true },
      },
      lease_charges: {
        include: { charge: true },
        where: { is_active: true },
      },
    },
  });

  return leases.filter((l) => l.invoices.length === 0);
}

export async function generateInvoicesForLeases(leaseIds: string[], createdBy?: string, targetDate = new Date()) {
  if (leaseIds.length === 0) {
    return { generated: 0, message: "No leases selected." };
  }

  const rentalCharge = await prisma.chargeMaster.findFirst({
    where: { charge_name: "Monthly Rental" },
  });

  const { y, m } = currentMonthKey(targetDate);
  const monthStart = startOfMonth(new Date(y, m, 1));
  const dueDate = addMonths(monthStart, 1);
  const invoiceNoPrefix = `INV-${y}${String(m + 1).padStart(2, "0")}`;

  const leases = await prisma.tenantLease.findMany({
    where: { lease_id: { in: leaseIds } },
    include: {
      unit: true,
      lease_charges: { include: { charge: true }, where: { is_active: true } }
    }
  });

  const existingCount = await prisma.invoice.count({
    where: { invoice_no: { startsWith: invoiceNoPrefix } },
  });

  let counter = existingCount;
  for (const lease of leases) {
    counter += 1;
    const invoiceNo = `${invoiceNoPrefix}-${String(counter).padStart(3, "0")}`;
    
    let detailsInput = [];
    let totalAmount = 0;

    if (lease.lease_charges.length > 0) {
      // Use configured lease charges
      for (const lc of lease.lease_charges) {
        const lineTotal = Number(lc.amount) * Number(lc.quantity);
        totalAmount += lineTotal;
        detailsInput.push({
          charge_id: lc.charge_id,
          description: lc.charge.charge_name,
          uom: lc.charge.uom,
          unit_price: lc.amount,
          quantity: lc.quantity,
          total_price: lineTotal,
        });
      }
    } else {
      // Fallback to unit's monthly_rent if no charges configured (MVP compatibility)
      const rent = Number(lease.unit.monthly_rent);
      if (rent > 0 && rentalCharge) {
        totalAmount += rent;
        detailsInput.push({
          charge_id: rentalCharge.charge_id,
          description: `Monthly rental - ${lease.unit.unit_number}`,
          uom: "month",
          unit_price: rent,
          quantity: 1,
          total_price: rent,
        });
      }
    }

    if (totalAmount > 0) {
      await prisma.invoice.create({
        data: {
          lease_id: lease.lease_id,
          invoice_no: invoiceNo,
          invoice_date: monthStart,
          due_date: dueDate,
          total_amount: totalAmount,
          status: "Unpaid",
          created_by: createdBy,
          details: {
            create: detailsInput
          },
        },
      });
    }
  }

  return {
    generated: leaseIds.length,
    message: `Generated ${leaseIds.length} invoice(s) for ${invoiceNoPrefix}.`,
  };
}

export async function markInvoicePaid(invoiceId: string, modifiedBy?: string) {
  const trimmed = invoiceId.trim();
  if (!trimmed) throw new Error("Invoice ID is required");

  return prisma.invoice.update({
    where: { invoice_id: trimmed },
    data: { status: "Paid", modified_by: modifiedBy },
  });
}
