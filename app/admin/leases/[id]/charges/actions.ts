"use server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addLeaseChargeAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const lease_id = String(formData.get("lease_id"));
  const charge_id = String(formData.get("charge_id"));
  const amount = Number(formData.get("amount"));
  const quantity = Number(formData.get("quantity") || "1");

  await prisma.leaseCharge.create({
    data: {
      lease_id,
      charge_id,
      amount,
      quantity,
      created_by: user.userId,
    }
  });
  revalidatePath(`/admin/leases/${lease_id}/charges`);
}

export async function removeLeaseChargeAction(formData: FormData) {
  await requireUser(["Admin"]);
  const lease_charge_id = String(formData.get("lease_charge_id"));
  const lease_id = String(formData.get("lease_id"));

  await prisma.leaseCharge.delete({
    where: { lease_charge_id }
  });
  revalidatePath(`/admin/leases/${lease_id}/charges`);
}
