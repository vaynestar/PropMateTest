"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * Sending a payment reminder (DEV-254).
 *
 * PropMate could already tell you exactly who owed what and for how long. It
 * could not do anything about it — every row of the old "Chasing payment"
 * table was read-only. Collecting money is the reason a management office
 * exists, so a system that measures arrears without chasing them is a
 * spreadsheet with a login.
 *
 * A reminder is a `Notification` row. That model already existed, already
 * carries a `lease_id`, and is already what the resident's bell reads, so
 * nothing new had to be stored. Two consequences fall out for free: the
 * resident actually sees it, and the arrears screen can read its own history
 * back and show what has already been done to each unit.
 *
 * There is no email. The app has no mail transport (Settings says as much),
 * so claiming "emailed" would be the kind of promise the audit in note 09
 * calls a screen lying about what the code does.
 */

type Outcome = { success?: boolean; message?: string; error?: string };

const COPY = {
  reminder: {
    type: "PAYMENT_REMINDER",
    title: (amount: string) => `Payment reminder: ${amount} outstanding`,
    message: (amount: string, n: number, oldest: number) =>
      `${amount} is outstanding on your unit across ${n} invoice${n === 1 ? "" : "s"}. ` +
      `The oldest has been due for ${oldest} days. You can see the breakdown and pay from Invoices.`,
  },
  final: {
    type: "PAYMENT_FINAL_NOTICE",
    title: (amount: string) => `Final notice: ${amount} outstanding`,
    message: (amount: string, n: number, oldest: number) =>
      `${amount} is outstanding on your unit across ${n} invoice${n === 1 ? "" : "s"}, ` +
      `the oldest ${oldest} days past its due date. Please settle it or contact the management ` +
      `office to agree an arrangement. Continued non-payment is dealt with under the by-laws.`,
  },
} as const;

function money(value: number) {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * One reminder per tenancy, whatever the number of unpaid invoices. A resident
 * with three overdue months gets one message about the total, not three.
 */
export async function sendArrearsReminders(leaseIds: string[], kind: "reminder" | "final"): Promise<Outcome> {
  try {
    await requireUser(["Admin"]);
  } catch {
    return { error: "You are not signed in as an administrator." };
  }

  if (!leaseIds.length) return { error: "No tenancy was selected." };

  const copy = COPY[kind];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leases = await prisma.tenantLease.findMany({
    where: { lease_id: { in: leaseIds } },
    include: {
      tenant: { select: { user_id: true, user_name: true } },
      unit: { select: { unit_number: true } },
      invoices: {
        where: { status: { notIn: ["Paid", "Inactive"] }, due_date: { lt: today } },
        select: { total_amount: true, due_date: true },
      },
    },
  });

  let sent = 0;
  const skipped: string[] = [];

  for (const lease of leases) {
    // No tenant on the lease means nobody to notify. Silently counting it as
    // sent is how an office ends up believing a unit was warned.
    if (!lease.tenant?.user_id) {
      skipped.push(`${lease.unit?.unit_number ?? "a unit"} has no resident on its lease`);
      continue;
    }
    if (lease.invoices.length === 0) {
      skipped.push(`${lease.unit?.unit_number ?? "a unit"} is no longer in arrears`);
      continue;
    }

    const owed = lease.invoices.reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);
    const oldest = lease.invoices.reduce((worst, i) => {
      const d = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86_400_000);
      return d > worst ? d : worst;
    }, 0);
    const amount = money(owed);

    await prisma.notification.create({
      data: {
        user_id: lease.tenant.user_id,
        lease_id: lease.lease_id,
        notification_type: copy.type,
        title: copy.title(amount),
        message: copy.message(amount, lease.invoices.length, oldest),
      },
    });
    sent++;
  }

  revalidatePath("/admin/billing/arrears");
  revalidatePath("/admin/invoices");

  if (sent === 0) {
    return { error: skipped[0] ? `Nothing was sent — ${skipped[0]}.` : "Nothing was sent." };
  }

  const what = kind === "final" ? "Final notice" : "Reminder";
  return {
    success: true,
    message:
      sent === 1
        ? `${what} sent to 1 resident`
        : `${what} sent to ${sent} residents`,
  };
}
