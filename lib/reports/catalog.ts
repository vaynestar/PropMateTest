/**
 * The report library (DEV-249).
 *
 * DEV-248 produced one ten-page document covering every module at once. The
 * user's verdict: "i think the report can be module based, and no need so
 * details, or better is to make various report preview in pdf". Correct — an
 * office never wants all of it. It wants the arrears list to chase payment,
 * the maintenance schedule before the committee meeting, the visitor log when
 * something went missing. One report, one question, one or two pages.
 *
 * Definitions only, no queries and no `server-only` import, so the admin
 * picker (a client component) and the print route can share this file.
 */

export type ReportModule = "Billing" | "Property" | "Maintenance" | "Facilities" | "Security";

/**
 * `period` counts what happened between two dates and honours the date-range
 * filter. `asat` is a position on the day it is run — arrears, occupancy, what
 * is due for service — and ignores the filter, because a unit is either
 * occupied today or it is not.
 */
export type ReportBasis = "period" | "asat";

export type ReportDef = {
  slug: string;
  module: ReportModule;
  title: string;
  /** One line in the picker: the question this report answers. */
  blurb: string;
  icon: string;
  basis: ReportBasis;
};

export const REPORTS: ReportDef[] = [
  {
    slug: "collection-summary",
    module: "Billing",
    title: "Billing and Collection Analysis",
    blurb: "What was billed, what came in, and the collection rate month by month.",
    icon: "trending_up",
    basis: "period",
  },
  {
    slug: "aged-receivables",
    module: "Billing",
    title: "Aged Receivables",
    // "Arrears" was retired from the interface in DEV-280; this blurb was missed.
    blurb: "Every unit that owes money, bracketed by how long it has been owed.",
    icon: "running_with_errors",
    basis: "asat",
  },
  {
    slug: "payments-received",
    module: "Billing",
    title: "Payments Received",
    blurb: "Each confirmed payment with its method and reference, for reconciliation.",
    icon: "receipt_long",
    basis: "period",
  },
  {
    slug: "occupancy-tenancy",
    module: "Property",
    title: "Occupancy and Tenancy",
    blurb: "Every unit, its status, and who is living in it.",
    icon: "home_work",
    basis: "asat",
  },
  {
    slug: "helpdesk-summary",
    module: "Maintenance",
    title: "Helpdesk Performance",
    blurb: "Tickets logged and closed, by category and priority, with time to resolve.",
    icon: "support_agent",
    basis: "period",
  },
  {
    slug: "open-work-orders",
    module: "Maintenance",
    title: "Open Work Orders",
    blurb: "Everything still unresolved, oldest first, with how long it has waited.",
    icon: "pending_actions",
    basis: "asat",
  },
  {
    slug: "facility-maintenance-schedule",
    module: "Facilities",
    title: "Facilities Maintenance Schedule",
    blurb: "When each facility was last serviced, when it is next due, and what is overdue.",
    icon: "handyman",
    basis: "asat",
  },
  {
    slug: "facility-utilisation",
    module: "Facilities",
    title: "Facility Utilisation",
    blurb: "Which amenities are used, for how long, and what is booked ahead.",
    icon: "pool",
    basis: "period",
  },
  {
    slug: "visitor-log",
    module: "Security",
    title: "Visitor Log",
    blurb: "Every pass issued, who came in, and who has not signed out.",
    icon: "badge",
    basis: "period",
  },
];

export const MODULE_ORDER: ReportModule[] = [
  "Billing",
  "Property",
  "Maintenance",
  "Facilities",
  "Security",
];

export const findReport = (slug: string) => REPORTS.find((r) => r.slug === slug);

/*
 * The date-range wording, in one place, so the filter button, the picker card
 * and the printed header cannot disagree.
 *
 * `quarter` is the stored key and it means the LAST 90 DAYS, not the calendar
 * quarter - see getDateRangeBoundary. It used to be labelled "This Quarter",
 * which is a different window and would have been a false statement on a
 * printed report. The key is misnamed; the words people read are not.
 */
export const RANGE_LABEL: Record<string, string> = {
  "30d": "Last 30 days",
  quarter: "Last 90 days",
  ytd: "Year to date",
  all: "All time",
};

/* ------------------------------------------------------------------ */
/* What a loaded report looks like. Nine reports, one renderer:        */
/* each loader returns blocks, so they cannot drift apart visually.    */
/* ------------------------------------------------------------------ */

export type ReportBlock =
  | { kind: "kpi"; items: { label: string; value: string }[] }
  | {
      kind: "table";
      caption?: string;
      head: string[];
      /** One character per column: "l" left, "r" right. Default: first left, rest right. */
      align?: string;
      rows: string[][];
      /** Rendered as a bold closing row. */
      total?: string[];
      empty?: string;
    }
  | { kind: "note"; text: string };

export type LoadedReport = {
  def: ReportDef;
  /** Sits under the title - the one sentence that says what is on the page. */
  summary: string;
  blocks: ReportBlock[];
};
