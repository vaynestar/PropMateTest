/**
 * The ticket vocabulary (DEV-256). No prisma, no `server-only` — both the
 * server pages and the client table import it.
 *
 * Six raw statuses live in the database: Open, In Progress, Pending Parts,
 * KIV, Resolved, Closed. Four of those are database words that leaked onto
 * the screen — a resident was shown "KIV", which stands for "keep in view"
 * and means nothing to anyone who has not worked in a Malaysian office, and
 * "Pending Parts" reads like a bug report. The six collapse to four states in
 * plain words, in the order work actually moves.
 *
 * Nothing is migrated. KIV and Closed are still read and still display; they
 * are simply no longer offered as new choices, so the set stops growing.
 */

export type TicketStateKey = "reported" | "doing" | "parts" | "done";

export const TICKET_STATES: Record<
  TicketStateKey,
  { label: string; blurb: string; raw: string[]; write: string }
> = {
  reported: {
    label: "Reported",
    blurb: "Logged, nobody has started.",
    raw: ["Open"],
    write: "Open",
  },
  doing: {
    label: "Someone is on it",
    blurb: "Assigned and under way.",
    raw: ["In Progress"],
    write: "In Progress",
  },
  parts: {
    label: "Waiting for parts",
    blurb: "Blocked on a supplier, not on us.",
    raw: ["Pending Parts", "KIV"],
    write: "Pending Parts",
  },
  done: {
    label: "Done",
    blurb: "Finished and closed off.",
    raw: ["Resolved", "Closed"],
    write: "Resolved",
  },
};

export const TICKET_STATE_ORDER: TicketStateKey[] = ["reported", "doing", "parts", "done"];

/** Every raw status that still means somebody has work to do. */
export const OPEN_STATUSES = ["Open", "In Progress", "Pending Parts", "KIV"];
export const DONE_STATUSES = ["Resolved", "Closed"];

export function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.includes(status);
}

export function ticketStateKey(status: string): TicketStateKey {
  for (const key of TICKET_STATE_ORDER) {
    if (TICKET_STATES[key].raw.includes(status)) return key;
  }
  // An unrecognised string is more likely to be open than finished, and
  // showing it as Done would quietly drop it off the queue.
  return "reported";
}

export function ticketStateLabel(status: string): string {
  return TICKET_STATES[ticketStateKey(status)].label;
}

/**
 * The four choices a dropdown offers. `value` is what goes into the database,
 * so an existing KIV ticket moved to "Waiting for parts" is rewritten as
 * Pending Parts and the KIV population shrinks on its own.
 */
export const TICKET_STATUS_OPTIONS = TICKET_STATE_ORDER.map((key) => ({
  key,
  value: TICKET_STATES[key].write,
  label: TICKET_STATES[key].label,
}));

/**
 * Tailwind tone per state. Four fixed meanings, as DESIGN.md requires:
 * neutral is "nothing has happened", primary is "in hand", amber is "blocked
 * and waiting", emerald is "finished".
 */
export const TICKET_STATE_TONE: Record<TicketStateKey, string> = {
  reported: "border-outline-variant/60 bg-surface-container-high text-on-surface",
  doing: "border-primary/45 bg-primary/10 text-primary",
  parts: "border-amber-500/45 bg-amber-500/10 text-amber-200",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
};

/** The dot colour used on the filter chips. */
export const TICKET_STATE_DOT: Record<TicketStateKey, string> = {
  reported: "bg-slate-300",
  doing: "bg-primary",
  parts: "bg-amber-400",
  done: "bg-emerald-400",
};

/**
 * Display reference for a ticket. `ticket_no` is the real one (DEV-256);
 * anything created before the backfill falls back to the old eight-character
 * slice of the UUID so no row renders blank.
 */
export function ticketRef(t: { ticket_no?: string | null; ticket_id: string }): string {
  return t.ticket_no || `#${t.ticket_id.slice(0, 8).toUpperCase()}`;
}
