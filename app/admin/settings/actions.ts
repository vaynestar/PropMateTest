"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateSystemParameters } from "@/lib/settings";
import { INVOICE_TEXT_KEYS, INVOICE_TEXT_LIMITS, MAX_TERMS, cleanInvoiceText } from "@/lib/invoice-document";
import { STORAGE_PURPOSES, STORAGE_PURPOSE_ORDER, validateStorageFolders } from "@/lib/storage/folders";

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

  // Where residents transfer payments (shown on their invoice page).
  for (const key of ["BILLING_BANK_NAME", "BILLING_BANK_ACCOUNT_NAME", "BILLING_BANK_ACCOUNT_NO"]) {
    const v = formData.get(key)?.toString();
    if (v !== undefined) updates[key] = v.trim();
  }

  // Invoice document wording (DEV-191). Only when that tab was on screen -
  // the form renders one tab at a time.
  if (formData.get(INVOICE_TEXT_KEYS.terms) !== null) {
    const terms = String(formData.get(INVOICE_TEXT_KEYS.terms) ?? "");
    if (terms.split(/\r?\n/).filter((l) => l.trim()).length > MAX_TERMS) {
      return { success: false, error: `Keep the terms to ${MAX_TERMS} points or fewer - one per line.` };
    }
    for (const [field, key] of Object.entries(INVOICE_TEXT_KEYS) as [keyof typeof INVOICE_TEXT_KEYS, string][]) {
      const raw = String(formData.get(key) ?? "");
      const max = INVOICE_TEXT_LIMITS[field];
      if (raw.trim().length > max) {
        return { success: false, error: `That text is too long - keep it under ${max} characters.` };
      }
      updates[key] = cleanInvoiceText(raw, max, field === "terms");
    }
  }

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

  // A checkbox sends nothing when unticked, and the form renders one tab at a
  // time - so only read it when the Visitors tab was the one saved. Before
  // DEV-191, saving any other tab switched host approval off.
  if (formData.get("VISITOR_OVERSTAY_ALERT_HOURS") !== null) {
    updates.VISITOR_REQUIRE_HOST_APPROVAL = formData.get("VISITOR_REQUIRE_HOST_APPROVAL") ? "true" : "false";
  }

  // Storage
  const maxUploadMb = formData.get("STORAGE_MAX_UPLOAD_MB")?.toString();
  if (maxUploadMb) updates.STORAGE_MAX_UPLOAD_MB = String(Math.min(Math.max(parseInt(maxUploadMb, 10) || 4, 1), 4));

  // FIREBASE_STORAGE_PREFIX is no longer editable: the bucket comes from env.

  // Storage folder masterfile - validated as a set so two kinds of upload can
  // never share a folder. Applies to new uploads only.
  if (STORAGE_PURPOSE_ORDER.some((p) => formData.get(STORAGE_PURPOSES[p].key) !== null)) {
    const checked = validateStorageFolders(
      Object.fromEntries(
        STORAGE_PURPOSE_ORDER.map((p) => [p, String(formData.get(STORAGE_PURPOSES[p].key) ?? "")])
      )
    );
    if (!checked.ok) return { success: false, error: checked.error };
    for (const p of STORAGE_PURPOSE_ORDER) updates[STORAGE_PURPOSES[p].key] = checked.folders[p];
  }

  const res = await updateSystemParameters(updates);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/admin/properties");
  revalidatePath("/print/invoice/[id]", "page");

  return res;
}
