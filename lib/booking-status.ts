/**
 * Booking status — single source of truth.
 *
 * `Booking.booking_status` is an unconstrained string and six different values
 * were once in play: the database held Pending, Confirmed, Reserved, Cancelled
 * and Completed, while the code also referenced Rejected. Nothing agreed —
 * `createBooking()` wrote "Reserved", which the status filter did not offer and
 * the KPI cards did not count, so a resident's new booking fell through every
 * bucket.
 *
 * There are now **two stored states**. Booking a facility confirms it: the slot
 * is free or it is not, and the overlap check already decides that. An approval
 * step was tried and removed (user decision, 2026-09-06) — it added a queue,
 * a status, a KPI card and an Approve button to a system whose only real
 * question is whether the slot is taken. Simpler is the point.
 *
 * **Completed is derived, not stored** — a booking whose end time has passed is
 * complete, and `getEffectiveStatus()` in AdminBookingList computes that.
 * Storing it as well would let the two disagree, so new code must not write it
 * (rows that already carry it still render).
 */

export type BookingStatusKey = "Confirmed" | "Cancelled";

export type BookingStatusMeta = {
  value: BookingStatusKey | "Completed";
  label: string;
  icon: string;
  /** Chip treatment in the list and table */
  chip: string;
  /** Bare text colour */
  text: string;
};

export const BOOKING_STATUSES: Record<string, BookingStatusMeta> = {
  Confirmed: {
    value: "Confirmed",
    label: "Confirmed",
    icon: "check_circle",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    text: "text-emerald-300",
  },
  Cancelled: {
    value: "Cancelled",
    label: "Cancelled",
    icon: "block",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    text: "text-rose-300",
  },
  // Derived from the clock, never written by new code.
  Completed: {
    value: "Completed",
    label: "Completed",
    icon: "history",
    chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
    text: "text-on-surface-variant",
  },
};

/** Order used by the status filter. Completed is offered by the past view. */
export const BOOKING_STATUS_ORDER: BookingStatusKey[] = ["Confirmed", "Cancelled"];

/**
 * Legacy spellings. "Pending" is here because the approval step existed
 * briefly and rows may carry it; a booking that was awaiting approval is now
 * simply confirmed.
 */
const ALIASES: Record<string, BookingStatusKey> = {
  reserved: "Confirmed",
  approved: "Confirmed",
  confirmed: "Confirmed",
  pending: "Confirmed",
  rejected: "Cancelled",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

export function normaliseBookingStatus(
  value: string | null | undefined
): BookingStatusKey | null {
  if (!value) return null;
  if (value in BOOKING_STATUSES && value !== "Completed") {
    return value as BookingStatusKey;
  }
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

const FALLBACK: BookingStatusMeta = {
  value: "Confirmed",
  label: "Unknown",
  icon: "help",
  chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
  text: "text-on-surface-variant",
};

/** Never throws — booking_status is an unconstrained column. */
export function bookingStatus(value: string | null | undefined): BookingStatusMeta {
  if (!value) return FALLBACK;
  if (value === "Completed") return BOOKING_STATUSES.Completed;
  const key = normaliseBookingStatus(value);
  if (!key) return { ...FALLBACK, label: value };
  return BOOKING_STATUSES[key];
}
