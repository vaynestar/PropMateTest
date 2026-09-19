import prisma from "@/lib/prisma";
import { DEFAULT_INVOICE_FOOTER, DEFAULT_INVOICE_TERMS } from "@/lib/invoice-document";
import { STORAGE_PURPOSES, STORAGE_PURPOSE_ORDER, folderProblem, normaliseFolder } from "@/lib/storage/folders";

export type SystemSettings = {
  general: {
    systemCurrency: string;
    dateFormat: string;
    defaultPropertyId: string;
  };
  billing: {
    gracePeriodDays: number;
    latePenaltyRate: number;
    invoiceCycleDay: number;
    taxRegistrationNo: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNo: string;
  };
  /** Wording on the invoice preview and PDF (DEV-191). */
  invoice: {
    issuer: string;
    contact: string;
    terms: string;
    footer: string;
  };
  helpdesk: {
    slaUrgentHours: number;
    slaHighHours: number;
    slaNormalHours: number;
    slaLowHours: number;
  };
  visitors: {
    passValidityHours: number;
    overstayAlertHours: number;
    requireHostApproval: boolean;
  };
  storage: {
    maxUploadMb: number;
    firebaseStoragePrefix: string;
    /** Storage folder masterfile - see lib/storage/folders.ts */
    folders: { purpose: string; key: string; label: string; accepts: string; folder: string; defaultFolder: string }[];
  };
  properties: {
    property_id: string;
    property_name: string;
    is_default: boolean;
  }[];
};

const DEFAULT_PARAMETERS: Record<string, { value: string; category: string; description: string }> = {
  SYSTEM_CURRENCY: { value: "MYR", category: "GENERAL", description: "Default currency code for billing and accounting" },
  SYSTEM_DATE_FORMAT: { value: "DD/MM/YYYY", category: "GENERAL", description: "Default date formatting display" },
  BILLING_GRACE_PERIOD_DAYS: { value: "14", category: "BILLING", description: "Days before unpaid invoices become overdue" },
  BILLING_LATE_PENALTY_RATE: { value: "10", category: "BILLING", description: "Annual late payment penalty interest rate (%)" },
  BILLING_INVOICE_CYCLE_DAY: { value: "1", category: "BILLING", description: "Day of month when recurring invoices are generated" },
  BILLING_TAX_REG_NO: { value: "W10-2408-32000192", category: "BILLING", description: "SST / Tax registration identifier" },
  BILLING_BANK_NAME: { value: "", category: "BILLING", description: "Bank residents transfer payments to" },
  BILLING_BANK_ACCOUNT_NAME: { value: "", category: "BILLING", description: "Account holder name residents transfer to" },
  BILLING_BANK_ACCOUNT_NO: { value: "", category: "BILLING", description: "Account number residents transfer to" },
  INVOICE_ISSUER_NAME: { value: "", category: "BILLING", description: "Name printed at the top of invoices (empty = property name)" },
  INVOICE_CONTACT: { value: "", category: "BILLING", description: "Office contact line printed at the foot of invoices" },
  INVOICE_TERMS: { value: DEFAULT_INVOICE_TERMS, category: "BILLING", description: "Invoice terms & conditions, one per line" },
  INVOICE_FOOTER: { value: DEFAULT_INVOICE_FOOTER, category: "BILLING", description: "Closing note printed on invoices" },
  MAINTENANCE_SLA_URGENT_HOURS: { value: "4", category: "HELPDESK", description: "Target turnaround time in hours for urgent tickets" },
  MAINTENANCE_SLA_HIGH_HOURS: { value: "24", category: "HELPDESK", description: "Target turnaround time in hours for high priority tickets" },
  MAINTENANCE_SLA_NORMAL_HOURS: { value: "72", category: "HELPDESK", description: "Target turnaround time in hours for normal tickets" },
  MAINTENANCE_SLA_LOW_HOURS: { value: "168", category: "HELPDESK", description: "Target turnaround time in hours for low priority tickets" },
  VISITOR_PASS_VALIDITY_HOURS: { value: "24", category: "VISITORS", description: "Default validity period for generated visitor QR passes" },
  VISITOR_OVERSTAY_ALERT_HOURS: { value: "12", category: "VISITORS", description: "Hours after check-in before an overstay alert triggers" },
  VISITOR_REQUIRE_HOST_APPROVAL: { value: "false", category: "VISITORS", description: "Require unit host confirmation before entry clearance" },
  STORAGE_MAX_UPLOAD_MB: { value: "5", category: "STORAGE", description: "Maximum allowable file size in megabytes for uploads" },
  STORAGE_FOLDER_ANNOUNCEMENT_IMAGE: { value: "announcements", category: "STORAGE", description: "Firebase Storage folder for announcement photos" },
  STORAGE_FOLDER_ANNOUNCEMENT_ATTACHMENT: { value: "circulars", category: "STORAGE", description: "Firebase Storage folder for announcement attachments" },
  STORAGE_FOLDER_FACILITY_IMAGE: { value: "facilities", category: "STORAGE", description: "Firebase Storage folder for facility photos" },
  STORAGE_FOLDER_TICKET_ATTACHMENT: { value: "tickets", category: "STORAGE", description: "Firebase Storage folder for helpdesk photos" },
  STORAGE_FOLDER_PAYMENT_RECEIPT: { value: "receipts", category: "STORAGE", description: "Firebase Storage folder for payment receipts" },
  FIREBASE_STORAGE_PREFIX: { value: "https://firebasestorage.googleapis.com/v0/b/propmate-uploads/o/", category: "STORAGE", description: "Base URL prefix for cloud assets" },
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const [params, properties] = await Promise.all([
    prisma.appParameter.findMany(),
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true, is_default: true },
      orderBy: { property_name: "asc" },
    }),
  ]);

  const paramMap = new Map<string, string>();
  params.forEach((p) => paramMap.set(p.param_key, p.param_value));

  // Auto-seed missing defaults
  const missingKeys = Object.keys(DEFAULT_PARAMETERS).filter((k) => !paramMap.has(k));
  if (missingKeys.length > 0) {
    try {
      await Promise.all(
        missingKeys.map((k) =>
          prisma.appParameter.create({
            data: {
              param_key: k,
              param_value: DEFAULT_PARAMETERS[k].value,
              category: DEFAULT_PARAMETERS[k].category,
              description: DEFAULT_PARAMETERS[k].description,
            },
          })
        )
      );
      missingKeys.forEach((k) => paramMap.set(k, DEFAULT_PARAMETERS[k].value));
    } catch {
      // Catch concurrent creation race gracefully
    }
  }

  const defaultProp = properties.find((p) => p.is_default) || properties[0];

  return {
    general: {
      systemCurrency: paramMap.get("SYSTEM_CURRENCY") || "MYR",
      dateFormat: paramMap.get("SYSTEM_DATE_FORMAT") || "DD/MM/YYYY",
      defaultPropertyId: defaultProp?.property_id || "",
    },
    billing: {
      gracePeriodDays: parseInt(paramMap.get("BILLING_GRACE_PERIOD_DAYS") || "14", 10),
      latePenaltyRate: parseFloat(paramMap.get("BILLING_LATE_PENALTY_RATE") || "10"),
      invoiceCycleDay: parseInt(paramMap.get("BILLING_INVOICE_CYCLE_DAY") || "1", 10),
      taxRegistrationNo: paramMap.get("BILLING_TAX_REG_NO") || "",
      bankName: paramMap.get("BILLING_BANK_NAME") || "",
      bankAccountName: paramMap.get("BILLING_BANK_ACCOUNT_NAME") || "",
      bankAccountNo: paramMap.get("BILLING_BANK_ACCOUNT_NO") || "",
    },
    invoice: {
      issuer: paramMap.get("INVOICE_ISSUER_NAME") ?? "",
      contact: paramMap.get("INVOICE_CONTACT") ?? "",
      terms: paramMap.get("INVOICE_TERMS") ?? DEFAULT_INVOICE_TERMS,
      footer: paramMap.get("INVOICE_FOOTER") ?? DEFAULT_INVOICE_FOOTER,
    },
    helpdesk: {
      slaUrgentHours: parseInt(paramMap.get("MAINTENANCE_SLA_URGENT_HOURS") || "4", 10),
      slaHighHours: parseInt(paramMap.get("MAINTENANCE_SLA_HIGH_HOURS") || "24", 10),
      slaNormalHours: parseInt(paramMap.get("MAINTENANCE_SLA_NORMAL_HOURS") || "72", 10),
      slaLowHours: parseInt(paramMap.get("MAINTENANCE_SLA_LOW_HOURS") || "168", 10),
    },
    visitors: {
      passValidityHours: parseInt(paramMap.get("VISITOR_PASS_VALIDITY_HOURS") || "24", 10),
      overstayAlertHours: parseInt(paramMap.get("VISITOR_OVERSTAY_ALERT_HOURS") || "12", 10),
      requireHostApproval: paramMap.get("VISITOR_REQUIRE_HOST_APPROVAL") === "true",
    },
    storage: {
      maxUploadMb: parseInt(paramMap.get("STORAGE_MAX_UPLOAD_MB") || "5", 10),
      firebaseStoragePrefix: paramMap.get("FIREBASE_STORAGE_PREFIX") || "",
      folders: STORAGE_PURPOSE_ORDER.map((p) => {
        const meta = STORAGE_PURPOSES[p];
        const v = normaliseFolder(paramMap.get(meta.key) || "");
        return {
          purpose: p,
          key: meta.key,
          label: meta.label,
          accepts: meta.accepts,
          folder: folderProblem(v) ? meta.defaultFolder : v,
          defaultFolder: meta.defaultFolder,
        };
      }),
    },
    properties,
  };
}

export async function updateSystemParameters(updates: Record<string, string>): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    for (const [key, value] of Object.entries(updates)) {
      await prisma.appParameter.upsert({
        where: { param_key: key },
        update: { param_value: String(value) },
        create: {
          param_key: key,
          param_value: String(value),
          category: DEFAULT_PARAMETERS[key]?.category || "SYSTEM",
          description: DEFAULT_PARAMETERS[key]?.description,
        },
      });
    }
    return { success: true, message: "System settings updated successfully." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update system parameters." };
  }
}

/**
 * Where residents send bank transfers. Null until all three are filled in
 * under Settings -> Billing, so a half-configured account is never shown.
 */
export async function getPaymentInstructions() {
  const rows = await prisma.appParameter.findMany({
    where: { param_key: { in: ["BILLING_BANK_NAME", "BILLING_BANK_ACCOUNT_NAME", "BILLING_BANK_ACCOUNT_NO"] } },
    select: { param_key: true, param_value: true },
  });
  const get = (k: string) => rows.find((r) => r.param_key === k)?.param_value.trim() ?? "";
  const bankName = get("BILLING_BANK_NAME");
  const accountName = get("BILLING_BANK_ACCOUNT_NAME");
  const accountNo = get("BILLING_BANK_ACCOUNT_NO");
  return bankName && accountName && accountNo ? { bankName, accountName, accountNo } : null;
}
