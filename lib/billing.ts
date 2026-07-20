import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    lease: { include: { unit: { include: { property: true } }; tenant: true } };
    details: { include: { charge: true } };
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

export async function listInvoices(): Promise<InvoiceWithRelations[]> {
  return prisma.invoice.findMany({
    orderBy: { invoice_date: "desc" },
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

export async function getRecentInvoices(limit = 5): Promise<InvoiceWithRelations[]> {
  return prisma.invoice.findMany({
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

export async function generateMonthlyInvoices(createdBy?: string) {
  const rentalCharge = await prisma.chargeMaster.findFirst({
    where: { charge_name: "Monthly Rental" },
  });
  if (!rentalCharge) {
    throw new Error(
      "Monthly Rental charge not found. Please seed charge master first."
    );
  }

  const { y, m } = currentMonthKey();
  const monthStart = startOfMonth(new Date(y, m, 1));
  const dueDate = addMonths(monthStart, 1);
  const invoiceNoPrefix = `INV-${y}${String(m + 1).padStart(2, "0")}`;

  // Active leases on occupied units that don't yet have an invoice this month
  const leases = await prisma.tenantLease.findMany({
    where: { status: "Active" },
    include: {
      unit: true,
      tenant: true,
      invoices: {
        where: { invoice_date: { gte: monthStart } },
        select: { invoice_id: true },
      },
    },
  });

  const candidates = leases.filter(
    (l) =>
      l.unit.status === "Occupied" &&
      l.unit.monthly_rent.toNumber() > 0 &&
      l.invoices.length === 0
  );

  if (candidates.length === 0) {
    return { generated: 0, message: "No new invoices to generate for this month." };
  }

  const existingCount = await prisma.invoice.count({
    where: { invoice_no: { startsWith: invoiceNoPrefix } },
  });

  let counter = existingCount;
  for (const lease of candidates) {
    counter += 1;
    const rent = lease.unit.monthly_rent;
    const invoiceNo = `${invoiceNoPrefix}-${String(counter).padStart(3, "0")}`;
    await prisma.invoice.create({
      data: {
        lease_id: lease.lease_id,
        invoice_no: invoiceNo,
        invoice_date: monthStart,
        due_date: dueDate,
        total_amount: rent,
        status: "Unpaid",
        created_by: createdBy,
        details: {
          create: [
            {
              charge_id: rentalCharge.charge_id,
              description: `Monthly rental - ${lease.unit.unit_number}`,
              uom: "month",
              unit_price: rent,
              quantity: 1,
              total_price: rent,
            },
          ],
        },
      },
    });
  }

  return {
    generated: candidates.length,
    message: `Generated ${candidates.length} invoice(s) for ${invoiceNoPrefix}.`,
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
