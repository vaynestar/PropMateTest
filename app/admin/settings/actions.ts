"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateSystemParameters } from "@/lib/settings";

export async function saveSettingsAction(formData: FormData) {
  await requireUser(["Admin"]);

  const updates: Record<string, string> = {};

  // General
  const currency = formData.get("SYSTEM_CURRENCY")?.toString();
  if (currency) updates.SYSTEM_CURRENCY = currency;

  const dateFormat = formData.get("SYSTEM_DATE_FORMAT")?.toString();
  if (dateFormat) updates.SYSTEM_DATE_FORMAT = dateFormat;

  const defaultPropertyId = formData.get("defaultPropertyId")?.toString();
  if (defaultPropertyId) {
    try {
      await prisma.$transaction([
        prisma.propertyMaster.updateMany({ data: { is_default: false } }),
        prisma.propertyMaster.update({
          where: { property_id: defaultPropertyId },
          data: { is_default: true },
        }),
      ]);
    } catch (e) {
      console.warn("Failed to set default property:", e);
    }
  }

  // Billing
  const gracePeriod = formData.get("BILLING_GRACE_PERIOD_DAYS")?.toString();
  if (gracePeriod) updates.BILLING_GRACE_PERIOD_DAYS = gracePeriod;

  const latePenalty = formData.get("BILLING_LATE_PENALTY_RATE")?.toString();
  if (latePenalty) updates.BILLING_LATE_PENALTY_RATE = latePenalty;

  const invoiceCycle = formData.get("BILLING_INVOICE_CYCLE_DAY")?.toString();
  if (invoiceCycle) updates.BILLING_INVOICE_CYCLE_DAY = invoiceCycle;

  const taxRegNo = formData.get("BILLING_TAX_REG_NO")?.toString();
  if (taxRegNo !== undefined) updates.BILLING_TAX_REG_NO = taxRegNo;

  // Helpdesk
  const slaUrgent = formData.get("MAINTENANCE_SLA_URGENT_HOURS")?.toString();
  if (slaUrgent) updates.MAINTENANCE_SLA_URGENT_HOURS = slaUrgent;

  const slaHigh = formData.get("MAINTENANCE_SLA_HIGH_HOURS")?.toString();
  if (slaHigh) updates.MAINTENANCE_SLA_HIGH_HOURS = slaHigh;

  const slaNormal = formData.get("MAINTENANCE_SLA_NORMAL_HOURS")?.toString();
  if (slaNormal) updates.MAINTENANCE_SLA_NORMAL_HOURS = slaNormal;

  const slaLow = formData.get("MAINTENANCE_SLA_LOW_HOURS")?.toString();
  if (slaLow) updates.MAINTENANCE_SLA_LOW_HOURS = slaLow;

  // Visitors
  const passValidity = formData.get("VISITOR_PASS_VALIDITY_HOURS")?.toString();
  if (passValidity) updates.VISITOR_PASS_VALIDITY_HOURS = passValidity;

  const overstayAlert = formData.get("VISITOR_OVERSTAY_ALERT_HOURS")?.toString();
  if (overstayAlert) updates.VISITOR_OVERSTAY_ALERT_HOURS = overstayAlert;

  const hostApproval = formData.get("VISITOR_REQUIRE_HOST_APPROVAL") ? "true" : "false";
  updates.VISITOR_REQUIRE_HOST_APPROVAL = hostApproval;

  // Storage
  const maxUploadMb = formData.get("STORAGE_MAX_UPLOAD_MB")?.toString();
  if (maxUploadMb) updates.STORAGE_MAX_UPLOAD_MB = maxUploadMb;

  const firebasePrefix = formData.get("FIREBASE_STORAGE_PREFIX")?.toString();
  if (firebasePrefix !== undefined) updates.FIREBASE_STORAGE_PREFIX = firebasePrefix;

  const res = await updateSystemParameters(updates);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/properties");

  return res;
}
