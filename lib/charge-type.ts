/**
 * Charge type — single source of truth.
 *
 * `ChargeMaster.charge_type` is an unconstrained string that gates real
 * behaviour: `charge_type: "Recurring"` is the filter deciding which charges
 * can be attached to a lease and billed every month. Before this module the
 * value was typed in three places with two different vocabularies — the seed
 * wrote "One-Time", the create/edit forms offered "One-Off" — so:
 *
 *   - the Edit modal's <select defaultValue="One-Time"> matched no option and
 *     silently fell back to the first one, "Recurring". Opening Access Card
 *     (a replacement-card fee) and pressing Save converted it into a charge
 *     billed to every tenant every month;
 *   - lib/reports.ts groups figures by charge_type, so "One-Time" and
 *     "One-Off" would have appeared as two separate categories for one thing.
 *
 * Import from here so a charge type means the same everywhere.
 *
 * "Penalty" was offered by the forms and read by nothing. It behaved exactly
 * like a one-time charge, so it is gone — the same reasoning that removed the
 * "Reserved" unit status in DEV-134. A late-payment penalty is a One-Time
 * charge named "Late payment penalty". The only distinction the system acts on
 * is whether a charge repeats every month, so that is the only one offered.
 */

export type ChargeTypeKey = "Recurring" | "One-Time";

export type ChargeTypeMeta = {
  /** Value persisted in ChargeMaster.charge_type */
  value: ChargeTypeKey;
  /** What the user reads */
  label: string;
  /** Shown under the picker so the choice is not a guess */
  hint: string;
  icon: string;
  /** Badge treatment in the charge table */
  badge: string;
};

export const CHARGE_TYPES: Record<ChargeTypeKey, ChargeTypeMeta> = {
  Recurring: {
    value: "Recurring",
    label: "Recurring",
    hint: "Billed automatically every month once it is added to a lease.",
    icon: "autorenew",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  },
  "One-Time": {
    value: "One-Time",
    label: "One-time",
    hint: "Added to a single invoice by hand. Never billed automatically.",
    icon: "counter_1",
    badge: "bg-surface-container-high text-on-surface-variant border-outline-variant/60",
  },
};

export const CHARGE_TYPE_ORDER: ChargeTypeKey[] = ["Recurring", "One-Time"];

const FALLBACK: ChargeTypeMeta = {
  value: "One-Time",
  label: "Unknown",
  hint: "",
  icon: "help",
  badge: "bg-surface-container-high text-on-surface-variant border-outline-variant/60",
};

/**
 * Legacy spellings seen in the wild. "One-Off" and "Penalty" were writable by
 * the forms before this module existed, so rows may carry them.
 */
const ALIASES: Record<string, ChargeTypeKey> = {
  "one-off": "One-Time",
  "one off": "One-Time",
  onetime: "One-Time",
  "one-time": "One-Time",
  penalty: "One-Time",
  recurring: "Recurring",
  monthly: "Recurring",
};

/** Normalise any stored value to a canonical key, or null if unrecognisable. */
export function normaliseChargeType(value: string | null | undefined): ChargeTypeKey | null {
  if (!value) return null;
  if (value in CHARGE_TYPES) return value as ChargeTypeKey;
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

/** Never throws — charge_type is an unconstrained column. */
export function chargeType(value: string | null | undefined): ChargeTypeMeta {
  const key = normaliseChargeType(value);
  if (!key) return value ? { ...FALLBACK, label: value } : FALLBACK;
  return CHARGE_TYPES[key];
}

/**
 * The rent line is looked up by NAME in two places — the invoice generator's
 * fallback (lib/billing.ts) and the recurring-charges summary — so renaming
 * this row on the Charge types page would silently stop both recognising rent.
 * The name lives here so the coupling is at least visible, and the charge
 * actions refuse to rename or deactivate it.
 */
export const RENT_CHARGE_NAME = "Monthly Rental";
