/**
 * Chart palette (DEV-194). Plain module, not a client one: server components
 * pass `colourFor` into client charts as a prop, which React refuses to do for
 * a function exported from a "use client" file.
 *
 * Purple is the neutral series, emerald means settled or arrived, amber means
 * waiting, rose means a problem.
 */
export const CHART = {
  primary: "#8b5cf6",
  positive: "#34d399",
  warning: "#fbbf24",
  critical: "#fb7185",
  info: "#38bdf8",
  muted: "#475569",
};

/**
 * Six ticket statuses had six hues — amber, purple, blue, rose, emerald,
 * grey — in one six-row bar list, and the hues disagreed with each other:
 * "Pending Parts" was rose (a problem) while "Open" was only amber, and KIV
 * was info-blue, which means nothing here. A bar list already encodes the
 * number in its length; colour should say what *kind* of row it is.
 *
 * Three states, which is all a ticket really has:
 *   amber   — waiting on us (Open, Pending Parts, KIV)
 *   primary — someone is on it (In Progress)
 *   muted   — finished (Resolved, Closed)
 *
 * The unit statuses below keep their four colours: those are a real
 * four-state taxonomy used on the unit rails throughout the Units page, not
 * a palette picked to fill a chart.
 */
const STATUS_COLOUR: Record<string, string> = {
  Occupied: CHART.positive,
  Vacant: CHART.muted,
  Repair: CHART.warning,
  Reserved: CHART.info,

  Open: CHART.warning,
  "Pending Parts": CHART.warning,
  KIV: CHART.warning,
  "In Progress": CHART.primary,
  Resolved: CHART.muted,
  Closed: CHART.muted,
};

/**
 * Age buckets are a ramp, not a taxonomy: fine → getting late → late.
 * "Today" was emerald, which read as *good*; a ticket logged an hour ago is
 * neither good nor bad, it is just new.
 */
export const ageColourFor = (label: string) =>
  label === "Over a week" ? CHART.critical : label === "4-7 days" ? CHART.warning : CHART.muted;

const FALLBACK = [CHART.primary, CHART.info, CHART.warning, CHART.critical, CHART.muted];

export const colourFor = (label: string, i = 0) => STATUS_COLOUR[label] ?? FALLBACK[i % FALLBACK.length];
