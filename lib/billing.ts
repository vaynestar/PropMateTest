import { Prisma } from "@prisma/client";
import { RENT_CHARGE_NAME } from "@/lib/charge-type";

import prisma from "@/lib/prisma";

/**
 * The tenant arrives without `password_hash`: the client omits it everywhere
 * (lib/prisma.ts, DEV-224), so the type says so too.
 */
type WithoutHash<T extends { lease: { tenant: unknown } }> = Omit<T, "lease"> & {
  lease: Omit<T["lease"], "tenant"> & { tenant: Omit<T["lease"]["tenant"], "password_hash"> };
};

type InvoiceWithRelations = WithoutHash<Prisma.InvoiceGetPayload<{
  include: {
    lease: { include: { unit: { include: { property: true } }; tenant: true } };
    details: { include: { charge: true } };
    modifier: { select: { user_name: true; user_email: true } };
    creator: { select: { user_name: true } };
  };
}>>;

/**
 * An invoice that also carries the bank-in slip waiting on it.
 *
 * `listInvoices` has always fetched this; the type never said so (DEV-260).
 * The invoice list reads it through `any[]`, so the gap stayed hidden until
 * a typed page used it — the Billing overview's "slips waiting" panel — and
 * then only on a **clean** build: an incremental `next build` reuses cached
 * type information and let it through, while Vercel always builds from
 * nothing. `getRecentInvoices` deliberately does not fetch them, which is
 * why this is a separate type rather than an optional field: a summary of
 * five rows has no business pulling payment evidence.
 */
export type InvoiceWithSlips = InvoiceWithRelations & {
  transactions: {
    transaction_id: string;
    payment_method: string;
    reference_number: string | null;
    transaction_amount: Prisma.Decimal;
    payment_date: Date;
    proof_mime: string | null;
    proof_filename: string | null;
    created_at: Date;
  }[];
};

/*
 * Which month a billing run belongs to, read in UTC (DEV-224).
 *
 * The caller hands over an instant. Read with getMonth() it meant "the month
 * on the SERVER's clock", and the dialog builds its month at local midnight -
 * so an administrator in Malaysia asking for September sent
 * 2026-08-31T16:00:00Z and Vercel, which runs in UTC, billed August. The
 * duplicate guard then looked at August too, found it clear, and wrote a
 * second set of invoices for a month the office had already billed.
 *
 * The same reasoning as the @db.Date rule and the booking-time fix in DEV-207:
 * one timezone for the stored calendar day, and that timezone is UTC.
 */
function currentMonthKey(date = new Date()) {
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() };
}

export async function listInvoices(propertyId?: string): Promise<InvoiceWithSlips[]> {
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
      // R3: a resident's "I've paid" waits here for the office to confirm.
      transactions: {
        where: { transaction_status: "Pending", payment_method: "Bank transfer" },
        orderBy: { created_at: "desc" },
        select: {
          transaction_id: true,
          payment_method: true,
          reference_number: true,
          transaction_amount: true,
          payment_date: true,
          proof_mime: true,
          proof_filename: true,
          created_at: true,
        },
      },
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

/**
 * What a lease would be billed for one month: its active recurring charges,
 * or failing that the unit's monthly rent. Zero means an invoice run writes
 * nothing for it (DEV-163). The invoice picker and the setup banner both ask
 * this one function, so they cannot disagree about which leases are ready.
 */
export function leaseBillableAmount(lease: {
  lease_charges: { amount: unknown; quantity: unknown }[];
  unit: { monthly_rent: unknown };
}) {
  if (lease.lease_charges.length > 0) {
    return lease.lease_charges.reduce(
      (sum, lc) => sum + Number(lc.amount) * Number(lc.quantity),
      0
    );
  }
  return Number(lease.unit.monthly_rent) || 0;
}

/**
 * Who is due an invoice this month, for one property.
 *
 * A billing run belongs to a building (user decision, 2026-11-01). This used
 * to return every active lease in the system, so the Invoices page could be
 * scoped to Residensi Suasana Damai, show its eight invoices, and then offer
 * to bill fourteen tenants across all four properties. The screen said one
 * thing and the button did another.
 *
 * `propertyId` is required by the callers that have an active property; it is
 * optional here only so the maintenance API route can still bill everything
 * deliberately.
 */
export async function getEligibleLeasesForInvoicing(
  targetDate = new Date(),
  propertyId?: string | null
) {
  const d = new Date(targetDate);
  // UTC, to agree with currentMonthKey and with invoice_date's @db.Date day.
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

  const leases = await prisma.tenantLease.findMany({
    where: {
      status: "Active",
      ...(propertyId ? { unit: { property_id: propertyId } } : {}),
    },
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
      const rent = Number(l.unit.monthly_rent) || 0;
      const amount = leaseBillableAmount(l);

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


/**
 * The two billing dates an admin controls (DEV-206). Defaults match the
 * seeded parameters: issued on the 1st, payable within 14 days.
 */
async function getBillingDateSettings() {
  const rows = await prisma.appParameter.findMany({
    where: { param_key: { in: ["BILLING_INVOICE_CYCLE_DAY", "BILLING_GRACE_PERIOD_DAYS"] } },
    select: { param_key: true, param_value: true },
  });
  const num = (k: string, fallback: number, min: number, max: number) => {
    const v = parseInt(rows.find((r) => r.param_key === k)?.param_value ?? "", 10);
    return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
  };
  return {
    invoiceCycleDay: num("BILLING_INVOICE_CYCLE_DAY", 1, 1, 28),
    gracePeriodDays: num("BILLING_GRACE_PERIOD_DAYS", 14, 1, 90),
  };
}

export async function generateInvoicesForLeases(
  leaseIds: string[],
  createdBy?: string,
  targetDate = new Date(),
  propertyId?: string | null
) {
  if (leaseIds.length === 0) {
    return { generated: 0, message: "No leases selected." };
  }

  /*
   * The picker only offers this property's leases, but a picker is a courtesy,
   * not a guard - the action takes lease ids straight from the client. Refuse
   * any that belong somewhere else (same reasoning as the booking rules in
   * DEV-207).
   */
  if (propertyId) {
    const foreign = await prisma.tenantLease.count({
      where: { lease_id: { in: leaseIds }, NOT: { unit: { property_id: propertyId } } },
    });
    if (foreign > 0) {
      throw new Error("Some of those tenancies belong to another property. Switch property and try again.");
    }
  }

  const rentalCharge = await prisma.chargeMaster.findFirst({
    where: { charge_name: RENT_CHARGE_NAME },
  });

  const { y, m } = currentMonthKey(targetDate);

  /*
   * Settings -> Billing decides both dates (DEV-206). The invoice is dated the
   * billing cycle day of the month, and payable within the grace period after
   * that - which is how strata charges work here: issued on a set day, due
   * within a stated number of days. Before this, both fields were saved and
   * read by nothing, and every invoice was simply dated the 1st and due a
   * month later.
   */
  const { invoiceCycleDay, gracePeriodDays } = await getBillingDateSettings();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  /*
   * Built in UTC, not local time. `invoice_date` and `due_date` are @db.Date,
   * and this codebase reads a @db.Date as "the UTC date is the calendar day".
   * `new Date(y, m, d)` is LOCAL midnight, so on a machine ahead of UTC - any
   * machine in Malaysia - 1 November became 31 October the moment it was
   * stored, and the November run produced invoices dated 31 Oct. Correct on
   * Vercel (UTC) and wrong on the developer's laptop, which is the mirror of
   * the booking-time bug fixed in DEV-207.
   */
  const invoiceDate = new Date(Date.UTC(y, m, Math.min(invoiceCycleDay, daysInMonth)));
  const dueDate = new Date(invoiceDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + gracePeriodDays);
  const invoiceNoPrefix = `INV-${y}${String(m + 1).padStart(2, "0")}`;

  const leases = await prisma.tenantLease.findMany({
    where: { lease_id: { in: leaseIds } },
    include: {
      unit: true,
      lease_charges: { include: { charge: true }, where: { is_active: true } }
    }
  });

  /*
   * One run at a time, per billing month (DEV-290).
   *
   * DEV-221 added the duplicate check below, but it reads and then writes
   * outside any transaction - a check-then-act race. Two admins generating
   * the same month both read "not billed yet" before either inserts, and both
   * insert. The UAT puts five administrators on the same property with a
   * "generate the monthly invoices" task, which is exactly the shape that
   * loses this race.
   *
   * Two things go wrong when it is lost, and the database already shows both:
   *
   *   - a lease billed twice for one month. Four lease+month pairs currently
   *     hold two live invoices each.
   *   - a repeated invoice NUMBER. `existingCount` continues the sequence, so
   *     two concurrent runs count the same total and mint the same
   *     `INV-YYYYMM-NNN`. Seven numbers are currently shared by two invoices.
   *
   * A unique index would be the stronger fix and is not available: the rows
   * above already violate it, and one of them (`INV-202609-810`) is a UAT
   * fixture that must not be deleted. So the guarantee is taken in the
   * database instead, with the same `pg_advisory_xact_lock` this codebase
   * already uses to settle the booking-overlap race in `createBooking`.
   *
   * The lock is keyed on the billing month, not the property: the invoice
   * number sequence is global to the month, so two different properties
   * running November concurrently would still collide on numbers.
   *
   * Everything that reads, decides and writes now happens inside the
   * transaction, after the lock. A second run waits, then sees the first
   * run's invoices and reports them as already billed - which is the correct
   * answer, not an error.
   */
  const lockKey = `invoice-run:${invoiceNoPrefix}`;

  const { created, skipped, duplicates } = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const existingCount = await tx.invoice.count({
        where: { invoice_no: { startsWith: invoiceNoPrefix } },
      });

      /*
       * Which of these leases is already billed for this month (DEV-221).
       * Re-read inside the lock, so it reflects any run that just finished.
       */
      const alreadyBilled = new Set(
        (
          await tx.invoice.findMany({
            where: { lease_id: { in: leaseIds }, invoice_no: { startsWith: invoiceNoPrefix } },
            select: { lease_id: true },
          })
        ).map((i) => i.lease_id)
      );

      let counter = existingCount;
      let created = 0;
      const skipped: { lease_id: string; label: string }[] = [];
      const duplicates: { lease_id: string; label: string }[] = [];

      for (const lease of leases) {
    if (alreadyBilled.has(lease.lease_id)) {
      duplicates.push({ lease_id: lease.lease_id, label: `Unit ${lease.unit.unit_number}` });
      continue;
    }

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

    await tx.invoice.create({
      data: {
        lease_id: lease.lease_id,
        invoice_no: invoiceNo,
        invoice_date: invoiceDate,
        due_date: dueDate,
        total_amount: totalAmount,
        status: "Unpaid",
        created_by: createdBy,
        details: { create: detailsInput },
      },
    });
    created += 1;
  }

      return { created, skipped, duplicates };
    },
    // A run covers every active tenancy in a property - thirty on the UAT
    // property - and each invoice writes its detail lines too.
    { timeout: 60_000, maxWait: 20_000 }
  );

  /*
   * This used to return `leaseIds.length` - the number of leases *selected* -
   * as the number of invoices *generated*, and the UI alerted that string. Pick
   * five tenants where two have nothing billable and the screen said "Generated
   * 5 invoice(s)" over three actual invoices. Two tenants went unbilled and
   * nobody found out until the money did not arrive.
   */
  const names = skipped.map((s) => s.label).join(", ");
  const dupNames = duplicates.map((d) => d.label).join(", ");

  const parts: string[] = [];
  if (created > 0) parts.push(`Generated ${created} invoice(s) for ${invoiceNoPrefix}.`);
  if (duplicates.length > 0) {
    parts.push(
      `${duplicates.length} already billed for ${invoiceNoPrefix} and were left alone: ${dupNames}. Pick another month, or another tenant.`
    );
  }
  if (skipped.length > 0) {
    parts.push(
      `${skipped.length} skipped - no charges set up and no monthly rent: ${names}. Add their recurring charges first.`
    );
  }
  if (parts.length === 0) parts.push(`Nothing to generate for ${invoiceNoPrefix}.`);

  return {
    generated: created,
    skipped: skipped.length,
    skippedLeases: skipped,
    duplicates: duplicates.length,
    duplicateLeases: duplicates,
    message: parts.join(" "),
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

/* ------------------------------------------------------------------ *
 * What a run will actually do (DEV-259)
 *
 * `getEligibleLeasesForInvoicing` answers "which leases can be billed".
 * That is half the question. The run reports eight invoices created and
 * says nothing about the four it passed over — a lease with no charges, a
 * tenancy that ended mid-month, a unit with nobody in it. Those four are the
 * ones somebody has to act on, and they were invisible.
 *
 * This returns both halves so the wizard can show the second one by name,
 * with a link to the screen that fixes each case.
 * ------------------------------------------------------------------ */

export type RunSkip = {
  leaseId: string;
  unitNumber: string;
  tenantName: string;
  why: string;
  fixLabel: string;
  fixHref: string;
};

export async function planInvoiceRun(targetDate = new Date(), propertyId?: string | null) {
  const d = new Date(targetDate);
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

  const leases = await prisma.tenantLease.findMany({
    where: {
      ...(propertyId ? { unit: { property_id: propertyId } } : {}),
      OR: [
        { status: "Active" },
        // A tenancy that ended inside the month being billed was live for part
        // of it, so its absence from the run is a decision somebody should see
        // rather than a silence. Anything that ended earlier is simply history.
        { move_out_date: { gte: monthStart, lt: monthEnd } },
      ],
    },
    include: {
      unit: { select: { unit_id: true, unit_number: true, monthly_rent: true, status: true } },
      tenant: { select: { user_id: true, user_name: true } },
      invoices: {
        where: { invoice_date: { gte: monthStart, lt: monthEnd } },
        select: { invoice_id: true },
      },
      lease_charges: { where: { is_active: true }, include: { charge: true } },
    },
    orderBy: { unit: { unit_number: "asc" } },
  });

  const billable: {
    leaseId: string;
    unitNumber: string;
    tenantName: string;
    charges: string;
    amount: number;
  }[] = [];
  const skipped: RunSkip[] = [];

  for (const l of leases) {
    const unitNumber = l.unit?.unit_number ?? "—";
    const tenantName = l.tenant?.user_name ?? "No tenant";
    const base = { leaseId: l.lease_id, unitNumber, tenantName };

    if (l.status !== "Active") {
      skipped.push({
        ...base,
        why: `Tenancy ended ${
          l.move_out_date
            ? new Date(l.move_out_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : "this month"
        }`,
        fixLabel: "View lease",
        fixHref: `/admin/leases?tenant=${l.tenant?.user_id ?? ""}`,
      });
      continue;
    }

    if (l.invoices.length > 0) {
      skipped.push({
        ...base,
        why: "Already invoiced for this month",
        fixLabel: "See the invoice",
        fixHref: `/admin/invoices?lease=${l.lease_id}`,
      });
      continue;
    }

    if (!l.tenant) {
      skipped.push({
        ...base,
        why: "No tenant on the lease, so there is nobody to bill",
        fixLabel: "View lease",
        fixHref: "/admin/leases",
      });
      continue;
    }

    // Rule 6: Decimal on monthly_rent and on every lease charge.
    const amount = leaseBillableAmount(l);
    if (amount <= 0) {
      skipped.push({
        ...base,
        why:
          l.lease_charges.length === 0
            ? "No recurring charges set, and no rent on the unit"
            : "Its charges add up to nothing",
        fixLabel: "Set charges",
        fixHref: `/admin/billing/recurring-charges?lease=${l.lease_id}`,
      });
      continue;
    }

    billable.push({
      ...base,
      charges:
        l.lease_charges.length > 0
          ? l.lease_charges.map((c) => c.charge?.charge_name ?? "Charge").join(" · ")
          : "Monthly rent",
      amount,
    });
  }

  billable.sort((a, b) => b.amount - a.amount);

  return {
    billable,
    skipped,
    total: billable.reduce((sum, r) => sum + r.amount, 0),
    dates: await getBillingDateSettings(),
  };
}
