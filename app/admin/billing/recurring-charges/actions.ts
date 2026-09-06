"use server";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRecurringChargesData(propertyId?: string | null) {
  await requireUser(["Admin"]);
  // Scoped to the property chosen in the top bar. Without this the page listed
  // every active lease in the portfolio while the header said one property.
  const leases = await prisma.tenantLease.findMany({
    where: {
      status: "Active",
      ...(propertyId ? { unit: { property_id: propertyId } } : {}),
    },
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

  // The in-module property picker was removed in DEV-137 (the top bar owns the
  // property), so the properties query it fed went with it.
  return { leases, chargeMasters };
}

export async function saveLeaseChargesAction(leaseId: string, charges: { charge_id: string; quantity: number; amount: number }[]) {
  const user = await requireUser(["Admin"]);

  await prisma.$transaction(async (tx) => {
    // Only the active lines are being replaced. deleteMany with just lease_id
    // also wiped deactivated historical charges, which the drawer never loaded
    // and therefore could not put back.
    await tx.leaseCharge.deleteMany({
      where: { lease_id: leaseId, is_active: true },
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

  // The billing overview totals read these charges too.
  revalidatePath("/admin/billing/recurring-charges");
  revalidatePath("/admin/billing");
  return { success: true };
}
