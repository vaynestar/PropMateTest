/**
 * What state is an invoice in, from the resident's point of view.
 *
 * "Overdue" was decided in three places and meant three things (R17):
 *
 *   - the home card compared `due_date` with the server's midnight, which on
 *     Vercel is Malaysian 8 am, and counted an invoice whose proof the office
 *     was still checking;
 *   - the invoices list compared Malaysian calendar days and let pending proof
 *     win, showing "Being checked";
 *   - the invoice detail page used the server's midnight again and ignored the
 *     proof, so the same invoice read Overdue there and Being checked in the
 *     list it was opened from.
 *
 * One rule now: proof under review outranks the due date, and the due date is
 * compared as a Malaysian calendar day.
 */

export type InvoiceState = "paid" | "voided" | "checking" | "overdue" | "unpaid";

/** YYYYMMDD in Malaysia, comparable as a number. */
export function dateKeyMY(value: Date | string): number {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(new Date(value))
    .split("-")
    .map(Number);
  return y * 10000 + m * 100 + d;
}

export function todayKeyMY(): number {
  return dateKeyMY(new Date());
}

/**
 * Settled: nothing more is owed, whatever the due date says.
 *
 * A voided invoice is stored as "Inactive" - that is what
 * app/admin/invoices/actions.ts writes and what every other screen tests for.
 * This function tested for "Voided", a value nothing writes, so a cancelled
 * invoice fell through to the date comparison and was shown to the resident
 * as Unpaid or Overdue, with a Pay button on a bill the office had withdrawn.
 * None exist today; it would have appeared the first time anyone voided one.
 */
const SETTLED = new Set(["Paid", "Inactive", "Voided"]);

export function isSettled(status: string): boolean {
  return SETTLED.has(status);
}

export function invoiceState(
  invoice: { status: string; due_date: Date | string },
  hasPendingProof: boolean,
  todayKey = todayKeyMY()
): InvoiceState {
  if (invoice.status === "Paid") return "paid";
  if (invoice.status === "Inactive" || invoice.status === "Voided") return "voided";
  if (hasPendingProof) return "checking";
  return dateKeyMY(invoice.due_date) < todayKey ? "overdue" : "unpaid";
}

/** Whole days late; 0 unless the invoice is actually overdue. */
export function daysLate(dueDate: Date | string, todayKey = todayKeyMY()): number {
  const dueKey = dateKeyMY(dueDate);
  if (dueKey >= todayKey) return 0;
  const toDate = (key: number) =>
    Date.UTC(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100);
  return Math.round((toDate(todayKey) - toDate(dueKey)) / 86400000);
}
