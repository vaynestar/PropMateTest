"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createChargeAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const charge_name = String(formData.get("charge_name"));
    const charge_type = String(formData.get("charge_type"));
    const uom = String(formData.get("uom"));
    const default_amount = Number(formData.get("default_amount"));
    const description = String(formData.get("description") || "");

    if (!charge_name.trim()) {
      return { error: "Charge name is required." };
    }

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
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to create charge" };
  }
}

export async function updateChargeAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const charge_id = String(formData.get("charge_id"));
    const charge_name = String(formData.get("charge_name"));
    const charge_type = String(formData.get("charge_type"));
    const uom = String(formData.get("uom"));
    const default_amount = Number(formData.get("default_amount"));
    const description = String(formData.get("description") || "");
    const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";

    if (!charge_id || !charge_name.trim()) {
      return { error: "Charge ID and Name are required." };
    }

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
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update charge" };
  }
}

export async function toggleChargeActiveAction(formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const charge_id = String(formData.get("charge_id"));
    const current_active = formData.get("current_active") === "true";

    await prisma.chargeMaster.update({
      where: { charge_id },
      data: {
        is_active: !current_active,
        modified_by: user.userId,
      }
    });
    revalidatePath("/admin/billing/charges");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to toggle charge status" };
  }
}
