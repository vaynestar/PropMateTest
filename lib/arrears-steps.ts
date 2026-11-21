/**
 * The escalation ladder, shared by the server query and the client screen
 * (DEV-254).
 *
 * It lives apart from `lib/arrears.ts` because that file imports prisma and
 * `server-only`, and the Chasing payment screen is a client component that
 * needs these four labels. Same split as `lib/reports/catalog.ts` against
 * `lib/reports/print-data.ts`.
 */

/** The step a tenancy has reached. The office escalates in these four. */
export type ArrearsStep = "late" | "first" | "second" | "final";

export const STEPS: {
  key: ArrearsStep;
  label: string;
  /** Days past the oldest unpaid due date that put a tenancy in this step. */
  from: number;
  to: number | null;
  blurb: string;
}[] = [
  { key: "late", label: "Just late", from: 1, to: 30, blurb: "Under a month. Usually an oversight." },
  { key: "first", label: "First reminder due", from: 31, to: 60, blurb: "A month gone, nothing said." },
  { key: "second", label: "Second reminder", from: 61, to: 90, blurb: "Two months. Put it in writing." },
  { key: "final", label: "Final notice", from: 91, to: null, blurb: "By-law 32 territory." },
];

export function stepFor(daysLate: number): ArrearsStep {
  if (daysLate > 90) return "final";
  if (daysLate > 60) return "second";
  if (daysLate > 30) return "first";
  return "late";
}

/** The notification types the arrears screen writes and reads back. */
export const REMINDER_TYPES = ["PAYMENT_REMINDER", "PAYMENT_FINAL_NOTICE"] as const;
