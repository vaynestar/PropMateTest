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

const STATUS_COLOUR: Record<string, string> = {
  Occupied: CHART.positive,
  Vacant: CHART.muted,
  Repair: CHART.warning,
  Reserved: CHART.info,
  Open: CHART.warning,
  "In Progress": CHART.primary,
  KIV: CHART.info,
  "Pending Parts": CHART.critical,
  Resolved: CHART.positive,
  Closed: CHART.muted,
};

const FALLBACK = [CHART.primary, CHART.info, CHART.warning, CHART.critical, CHART.muted];

export const colourFor = (label: string, i = 0) => STATUS_COLOUR[label] ?? FALLBACK[i % FALLBACK.length];
