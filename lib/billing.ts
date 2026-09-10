import { Prisma } from "@prisma/client";
import { RENT_CHARGE_NAME } from "@/lib/charge-type";

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
      modifier: { select: { user_name: true, user_email: true } },
      creator: { select: { user_name: true } },
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

  /*
   * A lease with no active charges falls back to the unit's monthly rent, and
   * if that is zero too there is nothing to bill - `generateInvoicesForLeases`
   * writes no invoice for it. It used to be offered here anyway, pre-selected
   * like every other row, and then silently skipped while the confirmation
   * counted it as billed. Work out what each lease would be billed and say so,
   * so the caller can refuse to select it rather than discover it afterwards.
   *
   * AGENTS.md Rule 6, twelfth occurrence: this goes straight to a client
   * component, and `unit.monthly_rent`, `unit.area_sqft` and `lease_charges[].amount`
   * are all Prisma Decimal. Only the fields the picker reads cross the boundary.
   */
  return leases
    .filter((l) => l.invoices.length === 0)
    .map((l) => {
      const chargeTotal = l.lease_charges.reduce(
        (sum, lc) => sum + Number(lc.amount) * Number(lc.quantity),
        0
      );
      const rent = Number(l.unit.monthly_rent) || 0;
      const amount = l.lease_charges.length > 0 ? chargeTotal : rent;

      return {
        lease_id: l.lease_id,
        chargeCount: l.lease_charges.length,
        monthlyRent: rent,
        billableAmount: amount,
        billable: amount > 0,
        unit: {
          unit_number: l.unit.unit_number,
          property: l.unit.property
            ? { property_name: l.unit.property.property_name }
            : null,
        },
        tenant: l.tenant ? { user_name: l.tenant.user_name } : null,
      };
    });
}

export async function generateInvoicesForLeases(leaseIds: string[], createdBy?: string, targetDate = new Date()) {
  if (leaseIds.length === 0) {
    return { generated: 0, message: "No leases selected." };
  }

  const rentalCharge = await prisma.chargeMaster.findFirst({
    where: { charge_name: RENT_CHARGE_NAME },
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
  let created = 0;
  const skipped: { lease_id: string; label: string }[] = [];

  for (const lease of leases) {
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

    /*
     * Nothing to bill: no active charges, and either no rent on the unit or no
     * "Monthly Rental" row in the charge masterfile to hang it on. Record which
     * lease and why - the caller has to be able to name them.
     */
    if (totalAmount <= 0) {
      skipped.push({
        lease_id: lease.lease_id,
        label: `Unit ${lease.unit.unit_number}`,
      });
      continue;
    }

    // Numbered only once we know an invoice is actually being written, or a
    // skipped lease would burn a number and leave a gap in the sequence.
    counter += 1;
    const invoiceNo = `${invoiceNoPrefix}-${String(counter).padStart(3, "0")}`;

    await prisma.invoice.create({
      data: {
        lease_id: lease.lease_id,
        invoice_no: invoiceNo,
        invoice_date: monthStart,
        due_date: dueDate,
        total_amount: totalAmount,
        status: "Unpaid",
        created_by: createdBy,
        details: { create: detailsInput },
      },
    });
    created += 1;
  }

  /*
   * This used to return `leaseIds.length` - the number of leases *selected* -
   * as the number of invoices *generated*, and the UI alerted that string. Pick
   * five tenants where two have nothing billable and the screen said "Generated
   * 5 invoice(s)" over three actual invoices. Two tenants went unbilled and
   * nobody found out until the money did not arrive.
   */
  const names = skipped.map((s) => s.label).join(", ");
  const message =
    skipped.length === 0
      ? `Generated ${created} invoice(s) for ${invoiceNoPrefix}.`
      : created === 0
      ? `No invoices generated. ${skipped.length} lease(s) have no charges set up and no monthly rent on the unit: ${names}. Add their recurring charges first.`
      : `Generated ${created} of ${leases.length} invoice(s) for ${invoiceNoPrefix}. ${skipped.length} skipped - no charges set up and no monthly rent: ${names}.`;

  return { generated: created, skipped: skipped.length, skippedLeases: skipped, message };
}

export async function markInvoicePaid(invoiceId: string, modifiedBy?: string) {
  const trimmed = invoiceId.trim();
  if (!trimmed) throw new Error("Invoice ID is required");

  return prisma.invoice.update({
    where: { invoice_id: trimmed },
    data: { status: "Paid", modified_by: modifiedBy },
  });
}
