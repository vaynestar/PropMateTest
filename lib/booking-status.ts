/**
 * Booking status — single source of truth.
 *
 * `Booking.booking_status` is an unconstrained string and six different values
 * were in play: the database held Pending, Confirmed, Reserved, Cancelled and
 * Completed, while the code also referenced Rejected. Nothing agreed:
 *
 *   - `createBooking()` wrote **"Reserved"** for every resident booking, but the
 *     status filter only offered Confirmed and Pending and the KPI cards count
 *     Pending. A resident's new booking therefore fell through every bucket —
 *     it never showed as waiting for approval, and never as confirmed;
 *   - the admin path wrote "Confirmed" for the same act, so the two halves of
 *     the app named one state two ways;
 *   - Rejected appeared in filter code and had never been written.
 *
 * Three states are stored. **Completed is derived, not stored** — a confirmed
 * booking whose end time has passed is complete, and `getEffectiveStatus()` in
 * AdminBookingList already computes that. Storing it as well would let the two
 * disagree, so new code must not write it (rows that already carry it still
 * render).
 */

export type BookingStatusKey = "Pending" | "Confirmed" | "Cancelled";

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
  Pending: {
    value: "Pending",
    label: "Waiting for approval",
    icon: "hourglass_top",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    text: "text-amber-300",
  },
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

/** Order used by the status filter. Completed is appended by the past view. */
export const BOOKING_STATUS_ORDER: BookingStatusKey[] = [
  "Pending",
  "Confirmed",
  "Cancelled",
];

/** Legacy spellings that were writable before this module existed. */
const ALIASES: Record<string, BookingStatusKey> = {
  reserved: "Confirmed",
  approved: "Confirmed",
  confirmed: "Confirmed",
  pending: "Pending",
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
  value: "Pending",
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
