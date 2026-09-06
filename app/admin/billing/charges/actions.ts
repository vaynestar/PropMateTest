"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { normaliseChargeType, RENT_CHARGE_NAME } from "@/lib/charge-type";

export async function createChargeAction(prevState: any, formData: FormData) {
  try {
    const user = await requireUser(["Admin"]);
    const charge_name = String(formData.get("charge_name")).trim();
    const uom = String(formData.get("uom")).trim().toLowerCase();
    const default_amount = Number(formData.get("default_amount"));
    const description = String(formData.get("description") || "").trim();

    if (!charge_name) {
      return { error: "Charge name is required." };
    }
    if (!Number.isFinite(default_amount) || default_amount < 0) {
      return { error: "Default amount must be zero or more." };
    }

    // charge_type gates whether a charge can be billed every month, so it is
    // validated rather than trusted — the forms used to be able to write
    // values ("One-Off", "Penalty") that no filter in the app matched.
    const charge_type = normaliseChargeType(String(formData.get("charge_type")));
    if (!charge_type) {
      return { error: "Pick a charge type." };
    }

    const clash = await prisma.chargeMaster.findFirst({
      where: { charge_name: { equals: charge_name, mode: "insensitive" } },
      select: { charge_name: true },
    });
    if (clash) {
      return { error: `"${clash.charge_name}" already exists. Edit that one instead.` };
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
    const charge_name = String(formData.get("charge_name")).trim();
    const uom = String(formData.get("uom")).trim().toLowerCase();
    const default_amount = Number(formData.get("default_amount"));
    const description = String(formData.get("description") || "").trim();
    const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";

    if (!charge_id || !charge_name) {
      return { error: "Charge ID and Name are required." };
    }
    if (!Number.isFinite(default_amount) || default_amount < 0) {
      return { error: "Default amount must be zero or more." };
    }

    const charge_type = normaliseChargeType(String(formData.get("charge_type")));
    if (!charge_type) {
      return { error: "Pick a charge type." };
    }

    const existing = await prisma.chargeMaster.findUnique({
      where: { charge_id },
      select: { charge_name: true },
    });
    if (!existing) {
      return { error: "That charge no longer exists." };
    }

    // The invoice generator and the recurring-charges summary both find the
    // rent line by this exact name, so renaming it here would silently stop
    // both recognising rent on every lease in the system.
    if (existing.charge_name === RENT_CHARGE_NAME) {
      if (charge_name !== RENT_CHARGE_NAME) {
        return {
          error: `"${RENT_CHARGE_NAME}" is used by name when invoices are generated. Its amount and description can change, but not its name.`,
        };
      }
      if (charge_type !== "Recurring") {
        return { error: `"${RENT_CHARGE_NAME}" has to stay recurring — rent is billed monthly.` };
      }
      if (!is_active) {
        return { error: `"${RENT_CHARGE_NAME}" cannot be switched off; rent would stop being billed.` };
      }
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

    const existing = await prisma.chargeMaster.findUnique({
      where: { charge_id },
      select: { charge_name: true },
    });
    if (!existing) {
      return { error: "That charge no longer exists." };
    }
    if (current_active && existing.charge_name === RENT_CHARGE_NAME) {
      return { error: `"${RENT_CHARGE_NAME}" cannot be switched off; rent would stop being billed.` };
    }

    // Switching a charge off hides it from the pickers but leaves the leases
    // already billing it untouched, so say how many those are rather than
    // letting it look like the charge has stopped.
    let inUse = 0;
    if (current_active) {
      inUse = await prisma.leaseCharge.count({
        where: { charge_id, is_active: true },
      });
    }

    await prisma.chargeMaster.update({
      where: { charge_id },
      data: {
        is_active: !current_active,
        modified_by: user.userId,
      }
    });
    revalidatePath("/admin/billing/charges");
    revalidatePath("/admin/billing/recurring-charges");
    return { success: true, inUse, charge_name: existing.charge_name };
  } catch (error: any) {
    return { error: error.message || "Failed to toggle charge status" };
  }
}
