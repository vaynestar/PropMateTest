"use server";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRecurringChargesData() {
  await requireUser(["Admin"]);
  const leases = await prisma.tenantLease.findMany({
    where: { status: "Active" },
    include: {
      tenant: true,
      unit: { include: { property: true } },
      lease_charges: { 
        where: { is_active: true },
        include: { charge: true } 
      }
    }
  });

  const chargeMasters = await prisma.chargeMaster.findMany({
    where: { charge_type: "Recurring" },
    orderBy: { charge_name: "asc" }
  });

  return { leases, chargeMasters };
}

export async function saveLeaseChargesAction(leaseId: string, charges: { charge_id: string; quantity: number; amount: number }[]) {
  const user = await requireUser(["Admin"]);

  await prisma.$transaction(async (tx) => {
    // Delete all current active lease charges for this lease
    await tx.leaseCharge.deleteMany({
      where: { lease_id: leaseId }
    });

    // Re-create them
    if (charges.length > 0) {
      await tx.leaseCharge.createMany({
        data: charges.map(c => ({
          lease_id: leaseId,
          charge_id: c.charge_id,
          quantity: c.quantity,
          amount: c.amount,
          created_by: user.userId,
        }))
      });
    }
  });

  revalidatePath("/admin/billing/recurring-charges");
  return { success: true };
}
