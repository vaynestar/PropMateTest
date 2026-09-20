"use client";

import { useMemo, useState, useTransition } from "react";
import {
  normaliseVisitorStatus,
  isStaleOnSite,
  hoursOnSite,
  maskIdentityNumber,
  maskPhoneNumber,
} from "@/lib/visitor-status";
import StatusBadge from "@/components/dashboard/StatusBadge";
import VisitorPassModal from "@/components/visitors/VisitorPassModal";
import EditVisitorModal from "@/components/visitors/EditVisitorModal";
import { updateVisitorStatus } from "./actions";
import { EmptyState, FIELD, SearchField, StatCard, StatGrid, TABLE, Toolbar } from "@/components/admin/ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "06 Sep" in Malaysia time - ICU prints "Sept" (DEV-184). */
const visitDay = (d: Date | string) => {
  const [, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(new Date(d))
    .split("-")
    .map(Number);
  return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]}`;
};

interface VisitorRecord {
  visitor_id: string;
  property_id?: string | null;
  lease_id?: string | null;
  visitor_type?: string | null;
  visitor_name: string;
  visitor_ic_no: string;
  contact_no?: string | null;
  vehicle_plate?: string | null;
  visit_purpose?: string | null;
  destination?: string | null;
  visit_date?: Date | string | null;
  check_in_time?: Date | string | null;
  check_out_time?: Date | string | null;
  status?: string | null;
  /** Gate crossings, newest first. */
  movements?: {
    movement_id: string;
    direction: string;
    occurred_at: Date | string;
    method: string;
    recorder?: { user_name: string } | null;
  }[];
  property?: {
    property_name: string;
  } | null;
  lease?: {
    unit: {
      unit_number: string;
      property?: {
        property_name: string;
      } | null;
    };
    tenant: {
      user_name: string;
      phone_number?: string | null;
    };
  } | null;
}

export default function AdminVisitorList({ visitors }: { visitors: VisitorRecord[] }) {
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingPassVisitor, setViewingPassVisitor] = useState<VisitorRecord | null>(null);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const handleUpdateStatus = (visitorId: string, status: string) => {
    setUpdatingId(visitorId);
    startTransition(async () => {
      await updateVisitorStatus(visitorId, status);
      setUpdatingId(null);
    });
  };

  /*
   * The KPI row was Total Registered / Currently On-Site / Pending Approval /
   * Today's Visits. "Pending Approval" counted a status nothing ever wrote and
   * no screen could clear, so it read 0 permanently; "Total Registered" counted
   * every pass ever issued, which is not a number anyone acts on.
   *
   * What a guardhouse actually needs to know: who is expected today, who is in
   * the building now, and whether any of those check-ins have gone stale.
   */
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const onSite = visitors.filter(
      (v) => normaliseVisitorStatus(v.status) === "Checked In"
    );
    const stale = onSite.filter((v) => isStaleOnSite(v.status, v.check_in_time));
    const today = visitors.filter((v) => {
      if (!v.visit_date) return false;
      return new Date(v.visit_date).toISOString().split("T")[0] === todayStr;
    });
    const expectedToday = today.filter(
      (v) => normaliseVisitorStatus(v.status) === "Approved"
    ).length;

    return {
      onSite: onSite.length,
      stale: stale.length,
      today: today.length,
      expectedToday,
    };
  }, [visitors]);

  // Filtered List
  const filteredVisitors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const todayStr = new Date().toISOString().split("T")[0];

    return visitors.filter((v) => {
      // 1. Text Search
      if (q) {
        const nameMatch = v.visitor_name.toLowerCase().includes(q);
        const icMatch = v.visitor_ic_no.toLowerCase().includes(q);
        const plateMatch = v.vehicle_plate?.toLowerCase().includes(q);
        const destMatch = v.destination?.toLowerCase().includes(q);
        const purposeMatch = v.visit_purpose?.toLowerCase().includes(q);
        const hostMatch = v.lease?.tenant?.user_name.toLowerCase().includes(q);
        const unitMatch = v.lease?.unit?.unit_number.toLowerCase().includes(q);

        if (!nameMatch && !icMatch && !plateMatch && !destMatch && !purposeMatch && !hostMatch && !unitMatch) {
          return false;
        }
      }

      // 2. Type Filter
      if (typeFilter !== "ALL") {
        const vType = v.visitor_type || "Resident Guest";
        if (vType !== typeFilter) return false;
      }

      // 3. Status Filter
      if (statusFilter !== "ALL") {
        if (v.status !== statusFilter) return false;
      }

      // 4. Timeframe Filter
      if (timeframeFilter !== "ALL" && v.visit_date) {
        const vDateStr = new Date(v.visit_date).toISOString().split("T")[0];
        if (timeframeFilter === "TODAY" && vDateStr !== todayStr) return false;
        if (timeframeFilter === "UPCOMING" && vDateStr < todayStr) return false;
        if (timeframeFilter === "PAST" && vDateStr >= todayStr) return false;
      }

      return true;
    });
  }, [visitors, searchQuery, typeFilter, statusFilter, timeframeFilter]);

  // Visitor Type Badge Formatter
  const getTypeBadge = (type?: string | null) => {
    const t = type || "Resident Guest";
    switch (t) {
      case "Contractor":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">construction</span>
            <span>Contractor</span>
          </span>
        );
      case "Delivery":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">local_shipping</span>
            <span>Delivery</span>
          </span>
        );
      case "Official":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">policy</span>
            <span>Official</span>
          </span>
        );
      case "General":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">badge</span>
            <span>General</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">person</span>
            <span>Resident Guest</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* What the guardhouse needs to know right now. */}
      <StatGrid cols={3}>
        <StatCard
          label="On site now"
          value={stats.onSite}
          hint="checked in"
          icon="sensors"
          tone={stats.onSite > 0 ? "positive" : "neutral"}
        />
        <StatCard label="Expected today" value={stats.expectedToday} hint="not arrived yet" icon="today" tone="primary" />
        <StatCard
          label="Not checked out"
          value={stats.stale}
          hint="passes left open"
          icon="running_with_errors"
          tone={stats.stale > 0 ? "critical" : "neutral"}
        />
      </StatGrid>

      <Toolbar
        right={
          <div className="flex rounded-xl border border-outline-variant/60 bg-surface-container-high p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-2 transition-colors ${
                viewMode === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
              title="Cards"
              aria-label="Card view"
            >
              <span className="material-symbols-outlined block text-[18px]">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-2 transition-colors ${
                viewMode === "table" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-white"
              }`}
              title="Table"
              aria-label="Table view"
            >
              <span className="material-symbols-outlined block text-[18px]">table_rows</span>
            </button>
          </div>
        }
      >
        <SearchField
          placeholder="Search name, IC, destination, host or plate…"
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={FIELD}>
          <option value="ALL">All visitor types</option>
          <option value="Resident Guest">Resident guests</option>
          <option value="Contractor">Contractors</option>
          <option value="Delivery">Deliveries</option>
          <option value="Official">Officials</option>
          <option value="General">Other</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FIELD}>
          <option value="ALL">All statuses</option>
          <option value="Checked In">On site</option>
          <option value="Approved">Expected</option>
          <option value="Checked Out">Left</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={timeframeFilter} onChange={(e) => setTimeframeFilter(e.target.value)} className={FIELD}>
          <option value="ALL">Any date</option>
          <option value="TODAY">Today</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="PAST">Past</option>
        </select>
      </Toolbar>

      {/* VISITOR DIRECTORY LIST */}
      {filteredVisitors.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container">
          <EmptyState
            icon="badge"
            title="No visitors match these filters"
            hint="Try clearing the search, or widening the status and date filters."
          />
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisitors.map((v) => {
            const isItemUpdating = isPending && updatingId === v.visitor_id;
            return (
              <div
                key={v.visitor_id}
                className="flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container p-4 transition-colors hover:border-primary/40"
              >
                {/* Who, where, and what state the visit is in. The card used to
                    be a column of label: value rows - a form printout rather
                    than something a guard can read at a glance (DEV-195). */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-bold leading-tight text-white" title={v.visitor_name}>
                      {v.visitor_name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                      {v.destination || (v.lease?.unit ? `Unit ${v.lease.unit.unit_number}` : "General property")}
                      {v.lease?.tenant ? ` · host ${v.lease.tenant.user_name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={v.status || "Pending"} />
                    <button
                      type="button"
                      onClick={() => setViewingPassVisitor(v)}
                      className="pressable flex items-center justify-center rounded-lg border border-primary/25 bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
                      title="View or print the pass"
                      aria-label={`View pass for ${v.visitor_name}`}
                    >
                      <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {getTypeBadge(v.visitor_type)}
                  {v.vehicle_plate && (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-amber-300">
                      {v.vehicle_plate}
                    </span>
                  )}
                  {v.property?.property_name && (
                    <span className="truncate text-[11px] text-on-surface-variant">{v.property.property_name}</span>
                  )}
                </div>

                {/* Times first: they are what the gate is asked about. */}
                <dl className="grid grid-cols-3 gap-2 border-t border-outline-variant/30 pt-3 text-xs">
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">Visit</dt>
                    <dd className="truncate font-semibold tabular-nums text-white">
                      {v.visit_date ? visitDay(v.visit_date) : "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">In</dt>
                    <dd className={`truncate font-semibold tabular-nums ${v.check_in_time ? "text-emerald-300" : "text-on-surface-variant"}`}>
                      {v.check_in_time
                        ? new Date(v.check_in_time).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kuala_Lumpur",
                          })
                        : "—"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-on-surface-variant">Out</dt>
                    <dd className={`truncate font-semibold tabular-nums ${v.check_out_time ? "text-sky-300" : "text-on-surface-variant"}`}>
                      {v.check_out_time
                        ? new Date(v.check_out_time).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kuala_Lumpur",
                          })
                        : "—"}
                    </dd>
                  </div>
                </dl>

                {/* Identity stays masked on the board; the full number is on the
                    pass, which is where identity is actually checked. */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-surface-variant">
                  <span title="Masked here. The full number is on the visitor pass.">
                    IC <span className="font-mono text-on-surface">{maskIdentityNumber(v.visitor_ic_no)}</span>
                  </span>
                  {v.contact_no && (
                    <span>
                      Tel <span className="font-mono text-on-surface">{maskPhoneNumber(v.contact_no)}</span>
                    </span>
                  )}
                </div>

                {v.visit_purpose && (
                  <p className="truncate text-[11px] text-on-surface-variant" title={v.visit_purpose}>
                    <span className="font-semibold text-on-surface">Purpose:</span> {v.visit_purpose}
                  </p>
                )}

                {isStaleOnSite(v.status, v.check_in_time) && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300">
                    <span className="material-symbols-outlined text-[15px] leading-none">running_with_errors</span>
                    {(() => {
                      const h = hoursOnSite(v.check_in_time) ?? 0;
                      const d = Math.floor(h / 24);
                      return d >= 1
                        ? `On site for ${d} day${d === 1 ? "" : "s"} — check them out`
                        : `On site ${h} hours — check them out`;
                    })()}
                  </div>
                )}

                {/* The record of the crossings themselves: who took them, and
                    whether the pass was scanned or waved through. */}
                {(v.movements?.length ?? 0) > 0 && (
                  <details className="rounded-lg border border-outline-variant/40 bg-surface-container-high/30 px-2.5 py-1.5">
                    <summary className="cursor-pointer text-[11px] font-semibold text-on-surface-variant hover:text-on-surface">
                      Gate log ({v.movements!.length})
                    </summary>
                    <ol className="mt-2 space-y-1">
                      {v.movements!.map((m) => (
                        <li key={m.movement_id} className="flex items-baseline justify-between gap-2 text-[10px]">
                          <span className={`font-semibold ${m.direction === "In" ? "text-emerald-300" : "text-sky-300"}`}>
                            {m.direction === "In" ? "In" : "Out"}
                          </span>
                          <span className="tabular-nums text-on-surface-variant">
                            {new Date(m.occurred_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Kuala_Lumpur",
                            })}
                          </span>
                          <span className="truncate text-on-surface-variant/70">
                            {m.method === "Scan" ? "scan" : "by hand"}
                            {m.recorder?.user_name ? ` · ${m.recorder.user_name}` : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                {/* Action Buttons */}
                <div className="mt-auto flex gap-2 border-t border-outline-variant/30 pt-3">
                  {v.status === "Pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Approved")}
                        disabled={isItemUpdating}
                        className="flex-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 pressable"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Cancelled")}
                        disabled={isItemUpdating}
                        className="flex-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 pressable"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                        <span>Decline</span>
                      </button>
                    </>
                  ) : v.status === "Approved" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Checked In")}
                        disabled={isItemUpdating}
                        className="flex-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 pressable"
                      >
                        <span className="material-symbols-outlined text-[16px]">sensors</span>
                        <span>Check In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(v.visitor_id, "Cancelled")}
                        disabled={isItemUpdating}
                        className="px-3 bg-surface-container-high text-on-surface-variant hover:text-white border border-outline-variant py-2 rounded-xl text-xs font-medium transition-colors pressable"
                      >
                        Cancel
                      </button>
                    </>
                  ) : v.status === "Checked In" ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(v.visitor_id, "Checked Out")}
                      disabled={isItemUpdating}
                      className="flex-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 pressable"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Mark Checked Out</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-2 text-center text-on-surface-variant text-xs font-medium opacity-60">
                      {v.status === "Checked Out" ? "Visit completed" : v.status}
                    </div>
                  )}
                  {/* Edit lives with the other actions. In the header, beside the
                      status chip and the QR button, it squeezed the visitor's name
                      down to five characters. */}
                  {v.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => setEditingVisitor(v)}
                      className="px-3 bg-surface-container-high text-on-surface-variant hover:text-primary border border-outline-variant hover:border-primary py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 pressable"
                      title="Edit visitor details"
                      aria-label={`Edit ${v.visitor_name}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DENSE TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
          <div className={TABLE.wrap}>
          <table className={TABLE.table + " min-w-[900px]"}>
            <thead>
              <tr>
                <th className={TABLE.th}>Visitor</th>
                <th className={TABLE.th}>IC / contact</th>
                <th className={TABLE.th}>Destination</th>
                <th className={TABLE.th}>Vehicle</th>
                <th className={TABLE.th}>Date &amp; time</th>
                <th className={TABLE.th}>Status</th>
                <th className={TABLE.thNum}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map((v) => (
                <tr key={v.visitor_id} className={TABLE.tr}>
                  <td className={TABLE.td}>
                    <div className="font-bold text-white">{v.visitor_name}</div>
                    <div className="mt-0.5">{getTypeBadge(v.visitor_type)}</div>
                  </td>
                  <td className={TABLE.td + " font-mono text-xs"}>
                    <div className="text-white">{maskIdentityNumber(v.visitor_ic_no)}</div>
                    {v.contact_no && <div className="text-[11px] text-on-surface-variant mt-0.5">{maskPhoneNumber(v.contact_no)}</div>}
                  </td>
                  <td className={TABLE.td}>
                    <div className="font-semibold text-white">
                      {v.destination || (v.lease?.unit ? `Unit ${v.lease.unit.unit_number}` : "-")}
                    </div>
                    {v.lease?.tenant && (
                      <div className="text-[11px] text-primary truncate max-w-[130px]">
                        Host: {v.lease.tenant.user_name}
                      </div>
                    )}
                  </td>
                  <td className={TABLE.td}>
                    {v.vehicle_plate ? (
                      <span className="font-mono font-bold text-amber-300 bg-surface-container-high px-1.5 py-0.5 rounded text-[11px]">
                        {v.vehicle_plate}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant opacity-40">-</span>
                    )}
                  </td>
                  <td className={TABLE.td}>
                    <div className="text-white font-medium">
                      {v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur" }) : "-"}
                    </div>
                    {v.check_in_time && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        In: {new Date(v.check_in_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}
                      </div>
                    )}
                  </td>
                  <td className={TABLE.td}>
                    <StatusBadge status={v.status || "Pending"} />
                  </td>
                  <td className={TABLE.td + " text-right"}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingPassVisitor(v)}
                        className="p-1 rounded-lg bg-surface-container-high border border-outline-variant/60 hover:border-primary text-primary transition-colors flex items-center justify-center pressable"
                        title="View / Download QR Pass"
                        aria-label="View QR Pass"
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                      </button>
                      {v.status !== "Cancelled" && (
                        <button
                          type="button"
                          onClick={() => setEditingVisitor(v)}
                          className="p-1 rounded-lg bg-surface-container-high border border-outline-variant/60 hover:border-primary text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center pressable"
                          title="Edit visitor details"
                          aria-label={`Edit ${v.visitor_name}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}

                      {v.status === "Pending" ? (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(v.visitor_id, "Approved")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-500/25"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(v.visitor_id, "Cancelled")}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold hover:bg-rose-500/25"
                          >
                            Decline
                          </button>
                        </>
                      ) : v.status === "Approved" ? (
                        <button
                          onClick={() => handleUpdateStatus(v.visitor_id, "Checked In")}
                          className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-500/30"
                        >
                          Check In
                        </button>
                      ) : v.status === "Checked In" ? (
                        <button
                          onClick={() => handleUpdateStatus(v.visitor_id, "Checked Out")}
                          className="px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold hover:bg-cyan-500/25"
                        >
                          Check Out
                        </button>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant opacity-50 px-1">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {editingVisitor && (
        <EditVisitorModal visitor={editingVisitor} onClose={() => setEditingVisitor(null)} />
      )}

      {/* VISITOR PASS MODAL */}
      {viewingPassVisitor && (
        <VisitorPassModal
          visitor={viewingPassVisitor}
          onClose={() => setViewingPassVisitor(null)}
        />
      )}
    </div>
  );
}
