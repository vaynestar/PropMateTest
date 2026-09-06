/**
 * Visitor pass status — single source of truth.
 *
 * `Visitor.status` is an unconstrained string and **eight different values**
 * were in play across the module for what is really four states:
 *
 *   - the database held Pending, Approved, Checked In, Checked Out, Completed;
 *   - the list filter offered Checked In, Approved, Pending, Checked Out and
 *     **Declined** — so the two "Completed" rows could not be filtered at all,
 *     and Declined had never been written;
 *   - the QR scan action additionally tested for **Cancelled** and **Rejected**;
 *   - `updateVisitorStatus` validated none of them: it wrote whatever string it
 *     was handed.
 *
 * Four states are stored, using the names that already dominate the data so no
 * risky rename is needed. What changes is that everything now agrees on them.
 *
 * **Pending was folded into Approved.** One row of fourteen carried it, nothing
 * wrote it (both registration paths create Approved), no screen offered a way
 * to approve, and the "Pending Approval" counter read 0. It was a state with no
 * entrance and no exit — the same reasoning that removed booking approval.
 */

export type VisitorStatusKey = "Approved" | "Checked In" | "Checked Out" | "Cancelled";

export type VisitorStatusMeta = {
  value: VisitorStatusKey;
  /** What the guard reads on screen */
  label: string;
  icon: string;
  chip: string;
  text: string;
};

export const VISITOR_STATUSES: Record<VisitorStatusKey, VisitorStatusMeta> = {
  Approved: {
    value: "Approved",
    label: "Expected",
    icon: "schedule",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    text: "text-sky-300",
  },
  "Checked In": {
    value: "Checked In",
    label: "On site",
    icon: "sensors",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    text: "text-emerald-300",
  },
  "Checked Out": {
    value: "Checked Out",
    label: "Left",
    icon: "logout",
    chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
    text: "text-on-surface-variant",
  },
  Cancelled: {
    value: "Cancelled",
    label: "Cancelled",
    icon: "block",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    text: "text-rose-300",
  },
};

export const VISITOR_STATUS_ORDER: VisitorStatusKey[] = [
  "Approved",
  "Checked In",
  "Checked Out",
  "Cancelled",
];

/** Every spelling that has ever been written, folded onto a canonical state. */
const ALIASES: Record<string, VisitorStatusKey> = {
  approved: "Approved",
  pending: "Approved",
  expected: "Approved",
  "checked in": "Checked In",
  checkedin: "Checked In",
  onsite: "Checked In",
  "checked out": "Checked Out",
  checkedout: "Checked Out",
  completed: "Checked Out",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  declined: "Cancelled",
  rejected: "Cancelled",
};

export function normaliseVisitorStatus(
  value: string | null | undefined
): VisitorStatusKey | null {
  if (!value) return null;
  if (value in VISITOR_STATUSES) return value as VisitorStatusKey;
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

const FALLBACK: VisitorStatusMeta = {
  value: "Approved",
  label: "Unknown",
  icon: "help",
  chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
  text: "text-on-surface-variant",
};

/** Never throws — status is an unconstrained column. */
export function visitorStatus(value: string | null | undefined): VisitorStatusMeta {
  const key = normaliseVisitorStatus(value);
  if (!key) return value ? { ...FALLBACK, label: value } : FALLBACK;
  return VISITOR_STATUSES[key];
}

/**
 * A pass that says someone is on site days after their visit date is worse than
 * no information: the guardhouse board claims people are in the building who
 * went home last week. Three of fourteen rows were in exactly that state, one
 * of them ten days old.
 *
 * Nothing closes a visit automatically — a guard who forgets to scan someone
 * out leaves the record open forever — so the list surfaces how long a visitor
 * has been on site and flags the ones that cannot still be true.
 */
export function hoursOnSite(checkInTime: Date | string | null | undefined): number | null {
  if (!checkInTime) return null;
  const t = new Date(checkInTime).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 3_600_000));
}

/** On site since before today — almost certainly a missed check-out. */
export function isStaleOnSite(
  status: string | null | undefined,
  checkInTime: Date | string | null | undefined
): boolean {
  if (normaliseVisitorStatus(status) !== "Checked In") return false;
  const hours = hoursOnSite(checkInTime);
  return hours !== null && hours >= 24;
}

/**
 * Mask an NRIC or passport number for a screen that is read over a counter.
 *
 * The visitor directory printed every IC in full on every card. A guardhouse
 * monitor faces the lobby, so anyone standing at the counter could read the
 * identity numbers of every visitor that week — personal data under the PDPA
 * 2010, kept for no reason the list itself needs. The last four digits are
 * enough to match a person against the card in their hand, which is the only
 * thing the list is used for.
 *
 * The full number stays on the visitor's own pass and on the printed slip:
 * those are shown to the person it belongs to, or handed to them.
 *
 *   781105-08-5431  ->  •••••••••5431
 */
export function maskIdentityNumber(value: string | null | undefined): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return "•".repeat(Math.min(9, trimmed.length - 4)) + trimmed.slice(-4);
}

/**
 * Mask a phone number the same way and for the same reason as the IC.
 *
 * A guard needs to reach a visitor or their host occasionally, not to have
 * fourteen contact numbers legible from the counter. The last three digits are
 * enough to confirm you are dialling the right person once the number is
 * revealed.
 *
 *   019-2233445  ->  019-••••445
 */
export function maskPhoneNumber(value: string | null | undefined): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= 6) return trimmed;
  const head = trimmed.slice(0, 3);
  const tail = trimmed.slice(-3);
  return `${head}${"•".repeat(Math.min(4, trimmed.length - 6))}${tail}`;
}
