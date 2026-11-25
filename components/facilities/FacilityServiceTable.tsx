"use client";

import CoverThumb, { DEFAULT_FACILITY_COVER } from "@/components/ui/CoverThumb";
import { EmptyState, TABLE } from "@/components/admin/ui";
import { closureLabel, hasClosure } from "@/lib/facility-closure";

/**
 * Facilities as a service schedule (DEV-267, to the batch-3 `Facilities`
 * artboard).
 *
 * **Service and bookings are one table.** A pool that is overdue for its
 * pump service and open for booking tomorrow is one fact, and it was split
 * across two screens. Open tickets sit beside the service date for the same
 * reason: three tickets on a lift that has not been serviced since May is a
 * story, and neither column tells it alone.
 *
 * The card grid survives as a view — it carries the photographs — but this
 * is the default, because the question this page is opened with is *what is
 * overdue*, and a card grid cannot be read down a column.
 */

export type ServiceRow = {
  facility_id: string;
  facility_name: string;
  facility_type: string | null;
  facility_status: string | null;
  is_bookable: boolean;
  /** Temporary closure window (DEV-289). */
  closed_from?: Date | string | null;
  closed_until?: Date | string | null;
  closed_start_time?: string | null;
  closed_end_time?: string | null;
  closure_reason?: string | null;
  image_url: string | null;
  open_time: string;
  close_time: string;
  next_maintenance_date: string | Date | null;
  lastServicedOn: string | Date | null;
  lastServicedBy: string | null;
  openTickets: number;
};

const day = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

/** Days from today to a date; negative means it has already passed. */
export function daysUntil(d: string | Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
}

export function serviceState(r: ServiceRow): "overdue" | "soon" | "ok" | "unscheduled" {
  if (!r.next_maintenance_date) return "unscheduled";
  const d = daysUntil(r.next_maintenance_date);
  if (d < 0) return "overdue";
  if (d <= 30) return "soon";
  return "ok";
}

export default function FacilityServiceTable({
  rows,
  onLogService,
  onEdit,
}: {
  rows: ServiceRow[];
  onLogService: (facilityId: string) => void;
  onEdit: (facilityId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
      <div className={TABLE.wrap}>
        <table className={TABLE.table + " min-w-[1040px]"}>
          <caption className="sr-only">Facilities and their service schedule</caption>
          <thead>
            <tr>
              <th className={TABLE.th}>Facility</th>
              <th className={TABLE.th}>Open</th>
              <th className={TABLE.th}>Bookable</th>
              <th className={TABLE.th}>Last serviced</th>
              <th className={TABLE.th}>Next due</th>
              <th className={TABLE.th}>Open tickets</th>
              <th className={TABLE.thNum}>What happens next</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon="pool"
                    title="No facilities match these filters"
                    hint="Try another chip, or clear the filters above."
                  />
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const state = serviceState(r);
                const closed = r.facility_status === "Maintenance";
                const dueDays = r.next_maintenance_date ? daysUntil(r.next_maintenance_date) : null;

                const dueColour =
                  state === "overdue"
                    ? "text-rose-300"
                    : state === "soon"
                    ? "text-amber-300"
                    : state === "unscheduled"
                    ? "text-on-surface-variant"
                    : "text-on-surface";

                return (
                  <tr
                    key={r.facility_id}
                    className={TABLE.tr + (state === "overdue" ? " bg-rose-500/[0.04]" : "")}
                  >
                    <td className={TABLE.td + " align-top"}>
                      <span className="flex items-start gap-3">
                        <CoverThumb
                          src={r.image_url}
                          alt={r.facility_name}
                          fallback={DEFAULT_FACILITY_COVER}
                          sizes="64px"
                          className="h-9 w-12 shrink-0 rounded-lg border border-outline-variant/60"
                        />
                        <span className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onEdit(r.facility_id)}
                            className="block w-fit border-b border-primary/35 pb-px text-left font-bold text-on-surface hover:text-primary"
                          >
                            {r.facility_name}
                          </button>
                          <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                            {r.facility_type || "Facility"}
                          </span>
                          {/* Temporarily closed, with its window (DEV-289). */}
                          {hasClosure(r) && (
                            <span className="mt-1 inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                              <span className="material-symbols-outlined text-[12px] leading-none">
                                event_busy
                              </span>
                              Temporarily closed
                              <span className="font-mono font-normal text-amber-100/80">
                                {closureLabel(r)}
                              </span>
                            </span>
                          )}
                        </span>
                      </span>
                    </td>

                    <td className={TABLE.tdMuted + " whitespace-nowrap align-top tabular-nums"}>
                      {r.is_bookable ? `${r.open_time} – ${r.close_time}` : "—"}
                    </td>

                    <td className={TABLE.td + " align-top"}>
                      <span
                        className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          closed
                            ? "border-amber-500/45 bg-amber-500/10 text-amber-200"
                            : r.is_bookable
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-outline-variant bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {closed
                          ? "Closed for maintenance"
                          : r.is_bookable
                          ? "Residents can book"
                          : "Plant — no bookings"}
                      </span>
                    </td>

                    <td className={TABLE.td + " align-top"}>
                      {r.lastServicedOn ? (
                        <>
                          <span className="whitespace-nowrap tabular-nums text-on-surface">
                            {day(r.lastServicedOn)}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                            {r.lastServicedBy || "not recorded"}
                          </span>
                        </>
                      ) : (
                        /* Never serviced is not the same as up to date, and the
                           old card showed nothing at all for it. */
                        <span className="font-semibold text-sky-300">Never</span>
                      )}
                    </td>

                    <td className={TABLE.td + " align-top"}>
                      <span className={`whitespace-nowrap font-bold tabular-nums ${dueColour}`}>
                        {r.next_maintenance_date ? day(r.next_maintenance_date) : "Not scheduled"}
                      </span>
                      <span className={`mt-0.5 block text-[11px] ${dueColour}`}>
                        {dueDays === null
                          ? "set a date"
                          : dueDays < 0
                          ? `${Math.abs(dueDays)} days overdue`
                          : dueDays === 0
                          ? "due today"
                          : `in ${dueDays} days`}
                      </span>
                    </td>

                    <td className={TABLE.td + " align-top"}>
                      {r.openTickets > 0 ? (
                        <span className="inline-block whitespace-nowrap rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-300">
                          {r.openTickets} ticket{r.openTickets === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant/50">none</span>
                      )}
                    </td>

                    <td className={TABLE.tdNum + " align-top"}>
                      <button
                        type="button"
                        onClick={() => onLogService(r.facility_id)}
                        className={`pressable inline-flex h-9 items-center whitespace-nowrap rounded-xl px-3.5 text-xs font-bold transition-colors ${
                          state === "overdue"
                            ? "bg-rose-400 text-[#2a0710] hover:bg-rose-300"
                            : "border border-outline-variant/60 bg-surface-container-high font-semibold text-on-surface hover:text-white"
                        }`}
                      >
                        {state === "unscheduled" ? "Set a date" : "Log a service visit"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
