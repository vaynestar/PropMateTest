/**
 * ToyyibPay client - sandbox first.
 *
 * Major Project scope: residents pay an invoice through ToyyibPay's hosted
 * checkout (FPX). PropMate never draws bank logos or collects card or bank
 * details; the resident is redirected to ToyyibPay and comes back.
 *
 * Configuration (environment variables, set by the account owner):
 *   TOYYIBPAY_SECRET_KEY     userSecretKey from the ToyyibPay dashboard
 *   TOYYIBPAY_CATEGORY_CODE  a category created in that dashboard
 *   TOYYIBPAY_BASE_URL       default https://dev.toyyibpay.com (sandbox)
 * The gateway is off unless both the key and the category are present.
 *
 * Spec source (2026-09-15): toyyibpay.com/apireference returns 403 to automated
 * fetches; fields below follow the published field list mirrored at
 * toyyibpay-api-documentation.fajarhac.com. Two things are NOT in that
 * documentation and are therefore parsed defensively and must be confirmed
 * against a real sandbox bill before relying on them:
 *   1. the createBill response shape (commonly `[{ "BillCode": "..." }]`)
 *   2. the checkout URL (commonly `<base>/<BillCode>`)
 *
 * The callback is not signed, so it is never trusted on its own: every
 * "paid" is re-confirmed with getBillTransactions before an invoice changes.
 */

const DEFAULT_BASE = "https://dev.toyyibpay.com";

export type ToyyibPayConfig = {
  secretKey: string;
  categoryCode: string;
  baseUrl: string;
  isSandbox: boolean;
};

export function getToyyibPayConfig(): ToyyibPayConfig | null {
  const secretKey = process.env.TOYYIBPAY_SECRET_KEY?.trim();
  const categoryCode = process.env.TOYYIBPAY_CATEGORY_CODE?.trim();
  if (!secretKey || !categoryCode) return null;
  const baseUrl = (process.env.TOYYIBPAY_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/+$/, "");
  return { secretKey, categoryCode, baseUrl, isSandbox: baseUrl.includes("dev.") };
}

/** billName / billDescription accept only letters, digits, space and underscore. */
function sanitise(text: string, max: number) {
  return text.replace(/[^A-Za-z0-9 _]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function post(config: ToyyibPayConfig, path: string, fields: Record<string, string>) {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ToyyibPay ${path} returned HTTP ${res.status}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // ToyyibPay answers some errors with plain text, e.g. "[KEY-DID-NOT-EXIST]".
    throw new Error(`ToyyibPay ${path} did not return JSON: ${text.slice(0, 120)}`);
  }
}

export type CreateBillInput = {
  invoiceNo: string;
  description: string;
  amountRinggit: number;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  returnUrl: string;
  callbackUrl: string;
};

export async function createBill(config: ToyyibPayConfig, input: CreateBillInput) {
  const amountCents = Math.round(input.amountRinggit * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Invoice amount must be greater than zero.");
  }

  const data = await post(config, "/index.php/api/createBill", {
    userSecretKey: config.secretKey,
    categoryCode: config.categoryCode,
    billName: sanitise(`PropMate ${input.invoiceNo}`, 30),
    billDescription: sanitise(input.description, 100) || "Invoice payment",
    billPriceSetting: "1", // fixed amount
    billPayorInfo: "1", // collect payer details
    billAmount: String(amountCents), // in cents
    billReturnUrl: input.returnUrl,
    billCallbackUrl: input.callbackUrl,
    billExternalReferenceNo: input.invoiceNo,
    billTo: input.payerName.slice(0, 100),
    billEmail: input.payerEmail,
    billPhone: input.payerPhone.replace(/[^0-9]/g, "") || "0000000000",
    billPaymentChannel: "0", // FPX online banking
  });

  const first = Array.isArray(data) ? data[0] : data;
  const billCode =
    first && typeof first === "object" && "BillCode" in first
      ? String((first as Record<string, unknown>).BillCode)
      : "";
  if (!billCode) {
    throw new Error(`ToyyibPay did not return a bill code: ${JSON.stringify(data).slice(0, 160)}`);
  }

  return { billCode, paymentUrl: `${config.baseUrl}/${billCode}`, amountCents };
}

export type BillPaymentResult = {
  paid: boolean;
  status: "paid" | "pending" | "failed" | "none";
  amountCents: number | null;
  reference: string | null;
};

/**
 * The source of truth for whether a bill was paid. billpaymentStatus:
 * 1 = successful, 2 and 4 = pending, 3 = unsuccessful.
 */
export async function getBillPayment(config: ToyyibPayConfig, billCode: string): Promise<BillPaymentResult> {
  const data = await post(config, "/index.php/api/getBillTransactions", { billCode });
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  if (rows.length === 0) return { paid: false, status: "none", amountCents: null, reference: null };

  const paidRow = rows.find((r) => String(r.billpaymentStatus) === "1");
  const row = paidRow ?? rows[rows.length - 1];
  const code = String(row.billpaymentStatus ?? "");
  const amount = Number(row.billpaymentAmount);

  return {
    paid: code === "1",
    status: code === "1" ? "paid" : code === "3" ? "failed" : "pending",
    // billpaymentAmount is reported in ringgit, unlike billAmount - confirm in sandbox.
    amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : null,
    reference: row.billpaymentInvoiceNo ? String(row.billpaymentInvoiceNo) : null,
  };
}
