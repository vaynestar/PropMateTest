/**
 * Unit status — single source of truth.
 *
 * Before this module the same three states were encoded three different ways
 * (KPI cards, floor header, StatusBadge) and the DB value "Not Available" was
 * shown as "Reserved" in one place and "Maintenance / Offline" in another.
 * Import from here so a status looks and reads the same everywhere.
 *
 * Palette rationale: violet is the brand primary and is reserved for primary
 * ACTIONS. Statuses therefore never use violet — otherwise a status pill
 * competes with the page's main call to action.
 *
 *   Occupied  emerald  in use, earning
 *   Vacant    sky      available, actionable
 *   Repair    amber    needs attention
 *   Reserved  slate    deliberately held, inert
 */

export type UnitStatusKey = "Occupied" | "Vacant" | "Repair" | "Not Available";

export type UnitStatusMeta = {
  /** Value persisted in Unit.status */
  value: UnitStatusKey;
  /** What the user reads — one name, used in every surface */
  label: string;
  icon: string;
  /** Solid-ish treatment for the status control on a card */
  chip: string;
  /** Left accent rail on the unit card, so status is scannable without reading */
  rail: string;
  /** Icon tile + figure colour on the KPI row */
  accent: string;
  /** Bare text colour for inline counts */
  text: string;
  /** Native <option> needs an opaque background */
  option: string;
};

export const UNIT_STATUSES: Record<UnitStatusKey, UnitStatusMeta> = {
  Occupied: {
    value: "Occupied",
    label: "Occupied",
    icon: "person_check",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 focus:border-emerald-400",
    rail: "bg-emerald-500",
    accent: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    text: "text-emerald-400",
    option: "bg-surface-container text-white",
  },
  Vacant: {
    value: "Vacant",
    label: "Vacant",
    icon: "meeting_room",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/40 focus:border-sky-400",
    rail: "bg-sky-500",
    accent: "bg-sky-500/10 border-sky-500/25 text-sky-400",
    text: "text-sky-400",
    option: "bg-surface-container text-white",
  },
  Repair: {
    value: "Repair",
    label: "Repair",
    icon: "build",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/40 focus:border-amber-400",
    rail: "bg-amber-500",
    accent: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    text: "text-amber-400",
    option: "bg-surface-container text-white",
  },
  "Not Available": {
    value: "Not Available",
    label: "Reserved",
    icon: "lock",
    chip: "bg-slate-400/15 text-slate-300 border-slate-400/40 focus:border-slate-300",
    rail: "bg-slate-400",
    accent: "bg-slate-400/10 border-slate-400/25 text-slate-300",
    text: "text-slate-300",
    option: "bg-surface-container text-white",
  },
};

/**
 * Order used by filters and the status dropdown.
 *
 * "Not Available" (Reserved) was dropped in DEV-134. It had no workflow behind
 * it — nothing set it, nothing read it, and there was no record of who reserved
 * the unit or until when. A unit being held for someone is really a lease with
 * a future move-in date, which the system already models. The key is kept in
 * UNIT_STATUSES so any legacy row still renders, but it cannot be chosen.
 */
export const UNIT_STATUS_ORDER: UnitStatusKey[] = ["Vacant", "Occupied", "Repair"];

const FALLBACK: UnitStatusMeta = {
  value: "Vacant",
  label: "Unknown",
  icon: "help",
  chip: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
  rail: "bg-outline-variant",
  accent: "bg-surface-container-high border-outline-variant text-on-surface-variant",
  text: "text-on-surface-variant",
  option: "bg-surface-container text-white",
};

/** Never throws — unconstrained status strings are a known risk in this schema. */
export function unitStatus(status: string | null | undefined): UnitStatusMeta {
  if (!status) return FALLBACK;
  return UNIT_STATUSES[status as UnitStatusKey] ?? { ...FALLBACK, label: status };
}
