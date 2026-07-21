"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createChargeAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const charge_name = String(formData.get("charge_name"));
  const charge_type = String(formData.get("charge_type"));
  const uom = String(formData.get("uom"));
  const default_amount = Number(formData.get("default_amount"));
  const description = String(formData.get("description"));

  await prisma.chargeMaster.create({
    data: {
      charge_name,
      charge_type,
      uom,
      default_amount,
      description,
      is_active: true,
      created_by: user.userId,
    }
  });
  revalidatePath("/admin/billing/charges");
}

export async function updateChargeAction(formData: FormData) {
  const user = await requireUser(["Admin"]);
  const charge_id = String(formData.get("charge_id"));
  const charge_name = String(formData.get("charge_name"));
  const charge_type = String(formData.get("charge_type"));
  const uom = String(formData.get("uom"));
  const default_amount = Number(formData.get("default_amount"));
  const description = String(formData.get("description"));
  const is_active = formData.get("is_active") === "on";

  await prisma.chargeMaster.update({
    where: { charge_id },
    data: {
      charge_name,
      charge_type,
      uom,
      default_amount,
      description,
      is_active,
      modified_by: user.userId,
    }
  });
  revalidatePath("/admin/billing/charges");
}
