import "server-only";
import prisma from "@/lib/prisma";
import { getInvoiceById } from "@/lib/billing";
import type { SessionUser } from "@/lib/auth";

/**
 * Everything printed on an invoice (DEV-191) - one loader for the on-screen
 * preview (/print/invoice/[id]) and the downloadable PDF
 * (/api/invoices/[id]/pdf), so the two can't drift apart.
 *
 * The wording the office controls (issuer name, contact line, terms and
 * conditions, footer) lives in AppParameter and is edited under
 * Settings -> Invoice Document.
 */

export const INVOICE_TEXT_KEYS = {
  issuer: "INVOICE_ISSUER_NAME",
  contact: "INVOICE_CONTACT",
  terms: "INVOICE_TERMS",
  footer: "INVOICE_FOOTER",
} as const;

export const INVOICE_TEXT_LIMITS = { issuer: 120, contact: 200, terms: 3000, footer: 300 };
export const MAX_TERMS = 15;

export const DEFAULT_INVOICE_TERMS = [
  "Payment is due on or before the due date shown on this invoice.",
  "Please quote the invoice number as the reference when you transfer, then upload your receipt in the PropMate resident app.",
  "Payments are confirmed only after the management office has verified them.",
  "Late payment may be charged interest as set out in your tenancy agreement.",
  "This is a computer-generated invoice. No signature is required.",
].join("\n");

export const DEFAULT_INVOICE_FOOTER = "Thank you for your prompt payment.";

export type InvoiceDocSettings = {
  /** Settings -> General; "RM" unless the office changes it (DEV-206). */
  currency: string;
  issuer: string;
  contact: string;
  terms: string[];
  footer: string;
  taxNo: string;
  bank: { bankName: string; accountName: string; accountNo: string } | null;
};

export type InvoiceDoc = {
  id: string;
  invoiceNo: string;
  /** PAID / UNPAID / OVERDUE / DRAFT / VOIDED */
  status: string;
  issuedOn: string;
  dueOn: string;
  issuer: string;
  addressLines: string[];
  billTo: { name: string; unit: string; phone: string; email: string };
  lines: { description: string; qty: number; unitPrice: number; total: number }[];
  total: number;
  settings: InvoiceDocSettings;
};

/** Settings text: no control characters except newlines, trimmed, capped. */
export function cleanInvoiceText(v: string, max: number, multiline = false): string {
  const s = v.replace(/\r\n?/g, "\n").replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "");
  const tidy = multiline
    ? s.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, MAX_TERMS).join("\n")
    : s.trim();
  return tidy.slice(0, max);
}

export async function getInvoiceDocSettings(): Promise<InvoiceDocSettings> {
  const rows = await prisma.appParameter.findMany({
    where: {
      param_key: {
        in: [
          ...Object.values(INVOICE_TEXT_KEYS),
          "BILLING_TAX_REG_NO",
          "SYSTEM_CURRENCY",
          "BILLING_BANK_NAME",
          "BILLING_BANK_ACCOUNT_NAME",
          "BILLING_BANK_ACCOUNT_NO",
        ],
      },
    },
    select: { param_key: true, param_value: true },
  });
  const map = new Map(rows.map((r) => [r.param_key, r.param_value]));
  const get = (k: string) => (map.get(k) ?? "").trim();
  // A key that was never saved uses the default; one saved empty stays empty.
  const orDefault = (k: string, d: string) => (map.has(k) ? get(k) : d);

  const bankName = get("BILLING_BANK_NAME");
  const accountName = get("BILLING_BANK_ACCOUNT_NAME");
  const accountNo = get("BILLING_BANK_ACCOUNT_NO");

  return {
    currency: get("SYSTEM_CURRENCY") || "RM",
    issuer: get(INVOICE_TEXT_KEYS.issuer),
    contact: get(INVOICE_TEXT_KEYS.contact),
    terms: orDefault(INVOICE_TEXT_KEYS.terms, DEFAULT_INVOICE_TERMS)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    footer: orDefault(INVOICE_TEXT_KEYS.footer, DEFAULT_INVOICE_FOOTER),
    taxNo: get("BILLING_TAX_REG_NO"),
    bank: bankName && accountName && accountNo ? { bankName, accountName, accountNo } : null,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const myKey = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(d));
/** "16 Sep 2026" in Malaysia time (ICU prints "Sept"). */
export const docDate = (d: Date | string) => {
  const [y, m, dd] = myKey(d).split("-").map(Number);
  return `${dd} ${MONTHS[m - 1]} ${y}`;
};

/** "RM 1,234.50" - built by hand so the screen and the PDF agree exactly. */
export const docMoney = (n: number, currency = "RM") => {
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${currency} ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
};

/**
 * The invoice as printed, or null when it doesn't exist or this user may not
 * see it. Admin: any invoice. Resident: only an issued invoice on their own
 * lease (DEV-170 / DEV-171).
 */
export async function loadInvoiceDoc(id: string, user: SessionUser): Promise<InvoiceDoc | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [invoice, settings] = await Promise.all([getInvoiceById(id), getInvoiceDocSettings()]);
  if (!invoice) return null;
  if (user.role !== "Admin" && (invoice.lease.user_id !== user.userId || !invoice.issued_at)) return null;

  const { lease, details } = invoice;
  const { unit } = lease;
  const { property } = unit;

  let status = invoice.status === "Paid" ? "PAID" : invoice.status === "Voided" ? "VOIDED" : "UNPAID";
  if (status === "UNPAID" && !invoice.issued_at) status = "DRAFT";
  else if (status === "UNPAID" && myKey(invoice.due_date) < myKey(new Date())) status = "OVERDUE";

  // Many addresses already end with "57100 Kuala Lumpur" - don't print it twice.
  const inAddress = (v: string) => !!v && (property.address ?? "").toLowerCase().includes(v.toLowerCase());
  const keep = (v: string) => (inAddress(v) ? "" : v);
  const cityLine = [keep(property.postal_code), keep(property.city)].filter(Boolean).join(" ");
  return {
    id: invoice.invoice_id,
    invoiceNo: invoice.invoice_no,
    status,
    issuedOn: docDate(invoice.invoice_date),
    dueOn: docDate(invoice.due_date),
    issuer: settings.issuer || property.property_name,
    addressLines: [
      settings.issuer ? property.property_name : "",
      property.address ?? "",
      [cityLine, keep(property.state)].filter(Boolean).join(", "),
      keep(property.country ?? ""),
    ].filter((l) => l.trim()),
    billTo: {
      name: lease.tenant.user_name,
      unit: unit.unit_number,
      phone: lease.tenant.phone_number ?? "",
      email: lease.tenant.user_email ?? "",
    },
    lines: details.map((d) => ({
      description: d.description,
      qty: Number(d.quantity),
      unitPrice: Number(d.unit_price),
      total: Number(d.total_price),
    })),
    total: Number(invoice.total_amount),
    settings,
  };
}
