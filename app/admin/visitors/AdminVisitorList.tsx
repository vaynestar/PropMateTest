"use client";

import { useMemo, useState, useTransition } from "react";
import {
  normaliseVisitorStatus,
  isStaleOnSite,
  hoursOnSite,
  maskIdentityNumber,
  maskPhoneNumber,
  visitorStatus,
} from "@/lib/visitor-status";
import VisitorPassModal from "@/components/visitors/VisitorPassModal";
import EditVisitorModal from "@/components/visitors/EditVisitorModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import RowMenu from "@/components/admin/RowMenu";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { updateVisitorStatus, closeOpenVisits } from "./actions";
import { EmptyState, FIELD, SearchField, StatCard, StatGrid, TABLE } from "@/components/admin/ui";

/**
 * The gate log (DEV-276, to the batch-3 `Visitors` artboard).
 *
 * **"Who is inside right now" is the question a guardhouse is actually
 * asked** — by a resident, by a committee member, and by the police. The
 * screen answered it with a stat card above a wall of cards sorted by visit
 * date, behind three dropdowns.
 *
 * What changed:
 *
 * - **The table is the default**, with the columns a guard reads across:
 *   who, what kind, IC, vehicle, where they are going, where they are now,
 *   and the one thing to do next. Cards remain for phones and for anyone who
 *   prefers them.
 * - **Counted chips instead of two dropdowns.** Each says how many rows it
 *   holds before you choose it, counted over the whole set rather than the
 *   current search — the pattern used by Units, Residents and Tenancies.
 * - **Visitors who never signed out are a strip with a button**, not a
 *   number in a tile. Four stale check-ins is a scanning habit to fix.
 * - **A missing IC reads "Not recorded" in amber, not a dash.** The field is
 *   optional for a resident pre-registering a guest they have never met and
 *   the guard captures it at the gate (DEV-240); a blank cell could not tell
 *   that apart from an oversight.
 * - **The row's action follows the state:** expected visitors get *Check in*,
 *   visitors on site get *Check out*, and everything else sits in the ⋯ menu.
 *
 * **Identity numbers stay masked**, which the artboard does not show. That is
 * deliberate and it is not a regression: a guardhouse monitor faces the
 * lobby, and printing every visitor's full NRIC where a stranger at the
 * counter can read it is personal data exposed for no reason this list has
 * (see `maskIdentityNumber`). The full number is on the visitor's own pass.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "06 Sep" in Malaysia time — ICU prints "Sept" (DEV-184). */
const visitDay = (d: Date | string) => {
  const [, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(new Date(d))
    .split("-")
    .map(Number);
  return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]}`;
};

const clock = (d: Date | string) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kuala_Lumpur",
  });

/** Today in Malaysia, as YYYY-MM-DD — not the browser's timezone. */
const myDay = (d: Date | string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date(d));

const TYPE_TONE: Record<string, string> = {
  Contractor: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Delivery: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Official: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  General: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};
const typeTone = (t?: string | null) =>
  TYPE_TONE[t || ""] ?? "border-primary/30 bg-primary/10 text-primary";

export interface VisitorRecord {
  visitor_id: string;
  property_id?: string | null;
  lease_id?: string | null;
  visitor_type?: string | null;
  visitor_name: string;
  visitor_ic_no: string | null;
  contact_no?: string | null;
  vehicle_plate?: string | null;
  visit_purpose?: string | null;
  destination?: string | null;
  visit_date?: Date | string | null;
  check_in_time?: Date | string | null;
  check_out_time?: Date | string | null;
  status?: string | null;
  /** Who put the pass in the system (DEV-276). */
  creator?: { user_name: string; role?: string | null } | null;
  movements?: {
    movement_id: string;
    direction: string;
    occurred_at: Date | string;
    method: string;
    recorder?: { user_name: string } | null;
  }[];
  property?: { property_name: string } | null;
  lease?: {
    unit: { unit_number: string; property?: { property_name: string } | null };
    tenant: { user_name: string; phone_number?: string | null };
  } | null;
}

type ChipKey = "today" | "onsite" | "expected" | "stale" | "all";

export default function AdminVisitorList({
  visitors,
  overstayHours = 24,
}: {
  visitors: VisitorRecord[];
  /** From Settings → Visitors (DEV-205). */
  overstayHours?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingPassVisitor, setViewingPassVisitor] = useState<VisitorRecord | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);
  const [closingStale, setClosingStale] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const today = myDay(new Date());

  /*
   * Open on the first chip that holds something.
   *
   * "Today" is the right default on a working day, but on a quiet one it is
   * empty — and the screen then opens on an empty state while eight people
   * are shown as on site in the tiles directly above it. A filter that
   * contradicts the summary it sits under is worse than no default.
   */
  const [chip, setChip] = useState<ChipKey>(() => {
    const hasToday = visitors.some((v) => v.visit_date && myDay(v.visit_date) === myDay(new Date()));
    if (hasToday) return "today";
    if (visitors.some((v) => normaliseVisitorStatus(v.status) === "Checked In")) return "onsite";
    return "all";
  });

  /*
   * Counted over every visitor, not over the current search. A chip reading
   * "Never signed out 4" that drops to 0 because a name is typed in the box
   * is not telling you about the gate, it is telling you about the box.
   */
  const buckets = useMemo(() => {
    const onsite: VisitorRecord[] = [];
    const expected: VisitorRecord[] = [];
    const stale: VisitorRecord[] = [];
    const todays: VisitorRecord[] = [];

    for (const v of visitors) {
      const state = normaliseVisitorStatus(v.status);
      if (state === "Checked In") {
        onsite.push(v);
        if (isStaleOnSite(v.status, v.check_in_time, overstayHours)) stale.push(v);
      }
      if (v.visit_date && myDay(v.visit_date) === today) {
        todays.push(v);
        if (state === "Approved") expected.push(v);
      }
    }
    return { onsite, expected, stale, todays };
  }, [visitors, overstayHours, today]);

  /** Passes issued in the last seven days — the week's traffic. */
  const thisWeek = useMemo(() => {
    const since = Date.now() - 7 * 86_400_000;
    return visitors.filter((v) => v.visit_date && new Date(v.visit_date).getTime() >= since).length;
  }, [visitors]);

  const inChip = (v: VisitorRecord): boolean => {
    const state = normaliseVisitorStatus(v.status);
    switch (chip) {
      case "today":
        return !!v.visit_date && myDay(v.visit_date) === today;
      case "onsite":
        return state === "Checked In";
      case "expected":
        return state === "Approved";
      case "stale":
        return isStaleOnSite(v.status, v.check_in_time, overstayHours);
      default:
        return true;
    }
  };

  const filteredVisitors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return visitors.filter((v) => {
      if (!inChip(v)) return false;
      if (typeFilter !== "ALL" && (v.visitor_type || "Resident Guest") !== typeFilter) return false;
      if (!q) return true;
      return (
        v.visitor_name.toLowerCase().includes(q) ||
        (v.visitor_ic_no ?? "").toLowerCase().includes(q) ||
        !!v.vehicle_plate?.toLowerCase().includes(q) ||
        !!v.destination?.toLowerCase().includes(q) ||
        !!v.visit_purpose?.toLowerCase().includes(q) ||
        !!v.lease?.tenant?.user_name.toLowerCase().includes(q) ||
        !!v.lease?.unit?.unit_number.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitors, searchQuery, typeFilter, chip, overstayHours, today]);

  const setStatus = (v: VisitorRecord, status: string, said: string) => {
    setUpdatingId(v.visitor_id);
    startTransition(async () => {
      const res: any = await updateVisitorStatus(v.visitor_id, status);
      setUpdatingId(null);
      if (res?.error) setToast({ message: res.error, tone: "error" });
      else setToast({ message: said });
    });
  };

  const closeStale = () => {
    startTransition(async () => {
      const res: any = await closeOpenVisits(buckets.stale.map((v) => v.visitor_id));
      setClosingStale(false);
      if (res?.error) setToast({ message: res.error, tone: "error" });
      else
        setToast({
          message: `${res.closed} pass${res.closed === 1 ? "" : "es"} closed. The gate log says the office did it, not the gate.`,
        });
    });
  };

  /** Who put the pass in the system, in words. */
  const registeredBy = (v: VisitorRecord) => {
    if (!v.creator) return "Registered at the office";
    return v.creator.role === "Admin"
      ? `Walk-in, logged by ${v.creator.user_name}`
      : `Registered by ${v.creator.user_name}`;
  };

  const goingTo = (v: VisitorRecord) =>
    v.destination || (v.lease?.unit ? `Unit ${v.lease.unit.unit_number}` : "Not stated");

  /** Where the visitor is now, and when it happened. */
  const atTheGate = (v: VisitorRecord) => {
    const stale = isStaleOnSite(v.status, v.check_in_time, overstayHours);
    const meta = visitorStatus(v.status);
    const label = stale ? "Never signed out" : meta.label;
    const chipClass = stale ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : meta.chip;

    const bits: string[] = [];
    if (v.check_in_time)
      bits.push(`in ${stale ? `${visitDay(v.check_in_time)} ` : ""}${clock(v.check_in_time)}`);
    if (v.check_out_time) bits.push(`out ${clock(v.check_out_time)}`);
    if (!bits.length && v.visit_date) bits.push(`due ${visitDay(v.visit_date)}`);

    const hrs = hoursOnSite(v.check_in_time);
    const onFor =
      normaliseVisitorStatus(v.status) === "Checked In" && hrs !== null && hrs >= 1
        ? `${hrs} h on site`
        : null;

    return { label, chipClass, times: bits.join(" · "), onFor };
  };

  /** The one named thing to do to this row, given where it is. */
  const nextAction = (v: VisitorRecord) => {
    const state = normaliseVisitorStatus(v.status);
    if (isStaleOnSite(v.status, v.check_in_time, overstayHours))
      return {
        label: "Close the visit",
        primary: false,
        run: () =>
          startTransition(async () => {
            const res: any = await closeOpenVisits([v.visitor_id]);
            if (res?.error) setToast({ message: res.error, tone: "error" });
            else setToast({ message: `${v.visitor_name}'s pass is closed.` });
          }),
      };
    if (state === "Approved")
      return {
        label: "Check in",
        primary: true,
        run: () => setStatus(v, "Checked In", `${v.visitor_name} is on site.`),
      };
    if (state === "Checked In")
      return {
        label: "Check out",
        primary: true,
        run: () => setStatus(v, "Checked Out", `${v.visitor_name} has left.`),
      };
    return { label: "Show the pass", primary: false, run: () => setViewingPassVisitor(v) };
  };

  const menuFor = (v: VisitorRecord) => {
    const state = normaliseVisitorStatus(v.status);
    const items = [
      { label: "Show the pass", onSelect: () => setViewingPassVisitor(v) },
      ...(state !== "Cancelled"
        ? [{ label: "Edit the details", onSelect: () => setEditingVisitor(v) }]
        : []),
    ];
    if (state === "Approved") {
      items.push({
        label: "Cancel the pass",
        onSelect: () => setStatus(v, "Cancelled", `${v.visitor_name}'s pass is cancelled.`),
        danger: true,
        hint: "They are still expected until you do.",
      } as any);
    }
    return items;
  };

  const CHIPS: { key: ChipKey; label: string; n: number; dot: string }[] = [
    { key: "today", label: "Today", n: buckets.todays.length, dot: "bg-on-surface-variant" },
    { key: "onsite", label: "On site now", n: buckets.onsite.length, dot: "bg-emerald-400" },
    { key: "expected", label: "Expected", n: buckets.expected.length, dot: "bg-sky-400" },
    { key: "stale", label: "Never signed out", n: buckets.stale.length, dot: "bg-amber-400" },
    { key: "all", label: "Everything", n: visitors.length, dot: "bg-outline-variant" },
  ];

  return (
    <div className="space-y-5">
      <StatGrid cols={4}>
        <StatCard
          label="On site now"
          value={buckets.onsite.length}
          hint="checked in"
          icon="sensors"
          tone={buckets.onsite.length > 0 ? "positive" : "neutral"}
        />
        <StatCard
          label="Expected today"
          value={buckets.expected.length}
          hint="not arrived yet"
          icon="today"
          tone="primary"
        />
        <StatCard
          label="Never signed out"
          value={buckets.stale.length}
          hint={`open past ${overstayHours} h`}
          icon="running_with_errors"
          tone={buckets.stale.length > 0 ? "critical" : "neutral"}
        />
        <StatCard
          label="Passes this week"
          value={thisWeek}
          hint="last 7 days"
          icon="history"
          tone="neutral"
        />
      </StatGrid>

      {/*
        Not a statistic. Four passes left open is a scanning habit at the gate,
        and the fix is one button — closing them honestly, with the gate log
        recording that the office did it (DEV-276).
      */}
      {buckets.stale.length > 0 && (
        <div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3">
          <span className="material-symbols-outlined shrink-0 text-[20px] text-amber-400">
            schedule
          </span>
          <p className="min-w-[280px] flex-[999_1_280px] text-[13.5px] leading-relaxed">
            <strong className="text-amber-200">
              {buckets.stale.length} visitor{buckets.stale.length === 1 ? "" : "s"}{" "}
              {buckets.stale.length === 1 ? "has" : "have"} been on site for over {overstayHours}{" "}
              hours and never signed out.
            </strong>{" "}
            <span className="text-on-surface-variant">
              Almost always a missed scan at the gate, not {buckets.stale.length === 1 ? "someone" : "people"}{" "}
              still in the building.
            </span>
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setClosingStale(true)}
            className="pressable inline-flex h-9 shrink-0 items-center rounded-xl bg-amber-400 px-3.5 text-xs font-bold text-[#241a02] transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            Review and close them
          </button>
        </div>
      )}

      <nav aria-label="Filter visitors" className="flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => {
          const on = chip === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setChip(c.key)}
              className={`pressable inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-outline-variant/60 bg-surface-container text-on-surface-variant hover:text-white"
              }`}
            >
              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${c.dot}`} />
              {c.label}
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums ${
                  on ? "bg-primary/25 text-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {c.n}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`${FIELD} min-w-0 max-w-[190px]`}
            aria-label="Visitor type"
          >
            <option value="ALL">All visitor types</option>
            <option value="Resident Guest">Resident guests</option>
            <option value="Contractor">Contractors</option>
            <option value="Delivery">Deliveries</option>
            <option value="Official">Officials</option>
            <option value="General">Other</option>
          </select>
          <div className="hidden rounded-xl border border-outline-variant/60 bg-surface-container-high p-0.5 md:flex">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              title="Table"
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === "table" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined block text-[17px]">table_rows</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Card view"
              title="Cards"
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined block text-[17px]">grid_view</span>
            </button>
          </div>
        </div>
      </nav>

      <SearchField
        placeholder="Search name, IC, destination, host or plate…"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {filteredVisitors.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container">
          <EmptyState
            icon="person_search"
            title={
              searchQuery
                ? `Nothing matches “${searchQuery}” in ${CHIPS.find((c) => c.key === chip)?.label.toLowerCase()}`
                : `No visitors in ${CHIPS.find((c) => c.key === chip)?.label.toLowerCase()}`
            }
            hint={
              searchQuery
                ? "Clear the search, or try the Everything chip."
                : "Try another chip, or register a visitor at the counter."
            }
          />
        </div>
      ) : (
        <>
          {/* Table on a desktop, cards on a phone — the toggle only exists above md. */}
          <div className={viewMode === "table" ? "hidden md:block" : "hidden"}>
            <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
              <div className={TABLE.wrap}>
                <table className={`${TABLE.table} min-w-[1020px]`}>
                  <thead>
                    <tr>
                      <th className={TABLE.th}>Visitor</th>
                      <th className={TABLE.th}>Type</th>
                      <th className={TABLE.th}>IC / passport</th>
                      <th className={TABLE.th}>Vehicle</th>
                      <th className={TABLE.th}>Going to</th>
                      <th className={TABLE.th}>At the gate</th>
                      <th className={TABLE.thNum}>What happens next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisitors.map((v) => {
                      const gate = atTheGate(v);
                      const act = nextAction(v);
                      const stale = isStaleOnSite(v.status, v.check_in_time, overstayHours);
                      const busy = isPending && updatingId === v.visitor_id;
                      return (
                        <tr
                          key={v.visitor_id}
                          className={`${TABLE.tr} ${stale ? "bg-amber-500/[0.045]" : ""}`}
                        >
                          <td className={TABLE.td}>
                            <div className="font-bold text-white">{v.visitor_name}</div>
                            <div className="mt-0.5 text-[11px] text-on-surface-variant">
                              {registeredBy(v)}
                            </div>
                          </td>
                          <td className={TABLE.td}>
                            <span
                              className={`inline-block rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${typeTone(
                                v.visitor_type
                              )}`}
                            >
                              {v.visitor_type || "Resident Guest"}
                            </span>
                          </td>
                          <td className={TABLE.td}>
                            {v.visitor_ic_no ? (
                              <>
                                <span className="font-mono text-xs text-on-surface">
                                  {maskIdentityNumber(v.visitor_ic_no)}
                                </span>
                                {v.contact_no && (
                                  <span className="mt-0.5 block font-mono text-[11px] text-on-surface-variant">
                                    {maskPhoneNumber(v.contact_no)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span
                                className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-300"
                                title="Optional at registration — the guard takes it at the gate."
                              >
                                Not recorded
                              </span>
                            )}
                          </td>
                          <td className={TABLE.td}>
                            {v.vehicle_plate ? (
                              <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                                {v.vehicle_plate}
                              </span>
                            ) : (
                              <span className="text-xs text-on-surface-variant/50">On foot</span>
                            )}
                          </td>
                          <td className={TABLE.td}>
                            <div className="font-semibold text-on-surface">{goingTo(v)}</div>
                            {v.lease?.tenant && (
                              <div className="mt-0.5 max-w-[150px] truncate text-[11px] text-on-surface-variant">
                                {v.lease.tenant.user_name}
                              </div>
                            )}
                          </td>
                          <td className={TABLE.td}>
                            <span
                              className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${gate.chipClass}`}
                            >
                              {gate.label}
                            </span>
                            <div className="mt-1 text-[11px] tabular-nums text-on-surface-variant">
                              {gate.times}
                              {gate.onFor && !stale ? ` · ${gate.onFor}` : ""}
                            </div>
                          </td>
                          <td className={TABLE.td}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={busy || isPending}
                                onClick={act.run}
                                className={`pressable inline-flex h-9 items-center whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-colors disabled:opacity-50 ${
                                  act.primary
                                    ? "bg-primary text-on-primary hover:bg-primary/90"
                                    : "border border-outline-variant/60 bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                                }`}
                              >
                                {busy ? "…" : act.label}
                              </button>
                              <RowMenu
                                label={`More actions for ${v.visitor_name}`}
                                items={menuFor(v)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cards: always below md, and above it when the toggle says so. */}
          <div
            className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${
              viewMode === "table" ? "md:hidden" : ""
            }`}
          >
            {filteredVisitors.map((v) => {
              const gate = atTheGate(v);
              const act = nextAction(v);
              const stale = isStaleOnSite(v.status, v.check_in_time, overstayHours);
              const busy = isPending && updatingId === v.visitor_id;
              return (
                <div
                  key={v.visitor_id}
                  /*
                   * `min-w-0` is load-bearing. A grid item defaults to
                   * min-width:auto, so the nowrap "Never signed out" pill
                   * pushed the whole card wider than a 375px phone and the
                   * action button ran off the screen.
                   */
                  className={`flex min-w-0 flex-col gap-2.5 rounded-2xl border p-4 ${
                    stale
                      ? "border-amber-500/40 bg-amber-500/[0.05]"
                      : "border-outline-variant/60 bg-surface-container"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-bold text-white" title={v.visitor_name}>
                        {v.visitor_name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-on-surface-variant">{registeredBy(v)}</p>
                    </div>
                    <span
                      className={`shrink rounded-full border px-2.5 py-0.5 text-right text-[11px] font-bold leading-tight ${gate.chipClass}`}
                    >
                      {gate.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${typeTone(
                        v.visitor_type
                      )}`}
                    >
                      {v.visitor_type || "Resident Guest"}
                    </span>
                    {v.vehicle_plate && (
                      <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                        {v.vehicle_plate}
                      </span>
                    )}
                    {!v.visitor_ic_no && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-300">
                        No IC recorded
                      </span>
                    )}
                  </div>

                  <dl className="space-y-1 text-xs">
                    <div className="flex gap-2">
                      <dt className="w-[74px] shrink-0 text-on-surface-variant">Going to</dt>
                      <dd className="min-w-0 flex-1 font-semibold text-on-surface">{goingTo(v)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-[74px] shrink-0 text-on-surface-variant">At the gate</dt>
                      <dd className="min-w-0 flex-1 tabular-nums text-on-surface-variant">
                        {gate.times || "—"}
                        {gate.onFor && !stale ? ` · ${gate.onFor}` : ""}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy || isPending}
                      onClick={act.run}
                      className={`pressable inline-flex h-9 flex-1 items-center justify-center rounded-xl px-3 text-xs font-bold transition-colors disabled:opacity-50 ${
                        act.primary
                          ? "bg-primary text-on-primary hover:bg-primary/90"
                          : "border border-outline-variant/60 bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      {busy ? "…" : act.label}
                    </button>
                    <RowMenu label={`More actions for ${v.visitor_name}`} items={menuFor(v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={closingStale}
        tone="primary"
        title={`Close ${buckets.stale.length} open pass${buckets.stale.length === 1 ? "" : "es"}?`}
        body={`${buckets.stale
          .slice(0, 5)
          .map((v) => v.visitor_name)
          .join(", ")}${
          buckets.stale.length > 5 ? ` and ${buckets.stale.length - 5} more` : ""
        }. Each is marked as having left at the end of their visit day — not now — and the gate log records that the office closed it, not the gate.`}
        confirmLabel="Close them"
        cancelLabel="Leave them open"
        pending={isPending}
        onConfirm={closeStale}
        onClose={() => setClosingStale(false)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {editingVisitor && (
        <EditVisitorModal visitor={editingVisitor} onClose={() => setEditingVisitor(null)} />
      )}

      {viewingPassVisitor && (
        <VisitorPassModal visitor={viewingPassVisitor} onClose={() => setViewingPassVisitor(null)} />
      )}
    </div>
  );
}
