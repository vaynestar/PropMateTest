"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, requireUser } from "@/lib/auth";
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
  const overstayAlert = formData.get("VISITOR_OVERSTAY_ALERT_HOURS")?.toString();
  if (overstayAlert) updates.VISITOR_OVERSTAY_ALERT_HOURS = overstayAlert;

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

/* --------------------------------------------------------------------------
 * Administrator accounts.
 *
 * Until now the only way to add an administrator was a database script: the
 * Tenants screen hardcodes `role: "Resident"`, so it can never create one.
 *
 * This lives behind the admin session on purpose. A public "register as
 * admin" page would let anyone reach every property's residents, because
 * administrators in PropMate are global and not bound to one property.
 * -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function createAdminAccount(_state: any, formData: FormData) {
  try {
    const me = await requireUser(["Admin"]);

    const name = String(formData.get("user_name") ?? "").trim();
    const email = String(formData.get("user_email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone_number") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (name.length < 2) return { error: "Enter the administrator's full name." };
    if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address — it is their login." };
    if (password.length < 6) return { error: "Password: minimum 6 characters." };

    const clash = await prisma.user.findFirst({ where: { user_email: email }, select: { user_id: true } });
    if (clash) return { error: "That email already has an account." };

    await prisma.user.create({
      data: {
        user_name: name,
        user_email: email,
        phone_number: phone || null,
        password_hash: hashPassword(password),
        role: "Admin",
        is_active: true,
        created_by: me.userId,
      },
    });

    revalidatePath("/admin/settings");
    return { success: `${name} can now sign in.` };
  } catch {
    return { error: "Couldn't create the account. Check your connection and try again." };
  }
}

/**
 * Deactivate rather than delete. An administrator is referenced by
 * `created_by` / `modified_by` on properties, units, leases, invoices and
 * tickets, so deleting one would break those references and take the audit
 * trail with it. `is_active: false` already blocks sign-in (app/login/actions.ts)
 * and already removes them from the ticket assignee list.
 */
export async function setAdminActive(userId: string, active: boolean) {
  try {
    const me = await requireUser(["Admin"]);
    if (userId === me.userId) {
      return { error: "You cannot deactivate the account you are signed in with." };
    }

    const target = await prisma.user.findFirst({
      where: { user_id: userId, role: "Admin" },
      select: { user_id: true },
    });
    if (!target) return { error: "That administrator no longer exists." };

    if (!active) {
      const others = await prisma.user.count({
        where: { role: "Admin", is_active: true, user_id: { not: userId } },
      });
      if (others === 0) return { error: "This is the last active administrator — the system would lock everyone out." };
    }

    await prisma.user.update({
      where: { user_id: userId },
      data: { is_active: active, modified_by: me.userId },
    });
    revalidatePath("/admin/settings");
    return { success: active ? "Reactivated." : "Deactivated — they can no longer sign in." };
  } catch {
    return { error: "Couldn't update that administrator." };
  }
}
