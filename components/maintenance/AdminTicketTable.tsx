"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TicketDetailModal from "@/components/maintenance/TicketDetailModal";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { EmptyState, FIELD, SearchField, TABLE, Toolbar } from "@/components/admin/ui";
import {
  TICKET_STATE_DOT,
  TICKET_STATE_TONE,
  TICKET_STATUS_OPTIONS,
  isOpenStatus,
  ticketRef,
  ticketStateKey,
  ticketStateLabel,
} from "@/lib/ticket-states";
import {
  assignTicketsAction,
  setTicketStatusAction,
  updateTicketAction,
} from "@/app/admin/maintenance/actions";
import { dayMonth } from "@/lib/short-date";
import Link from "next/link";

/**
 * The helpdesk queue (rebuilt DEV-256).
 *
 * What was wrong with it. The reference on every row was "#AC7BBCB2" — eight
 * characters of a UUID, which nobody reads down a phone to a contractor. The
 * status column showed the database's own words, so "Pending Parts" and "KIV"
 * were on screen. And the row was read-only: an admin who could see that five
 * tickets had no owner had to open the Manage modal five times to fix it.
 *
 * What it does now. Real ticket numbers (PM-0118). Four states in plain words.
 * Owner and state are both set from the row, and every unowned ticket can be
 * handed over at once from the band at the top.
 */

const PRIORITY_FLAG: Record<string, { rail: string; icon: string }> = {
  Urgent: { rail: "border-rose-400", icon: "text-rose-300" },
  High: { rail: "border-amber-400", icon: "text-amber-300" },
  Medium: { rail: "border-primary", icon: "text-primary" },
  // Not `on-surface-variant` (#cbc3d7): that is a lavender grey, near enough
  // to the primary violet (#d0bcff) that Low and Medium read as the same
  // colour at 15px. Slate is unmistakably the quiet one.
  Low: { rail: "border-slate-500", icon: "text-slate-400" },
};
const flagFor = (priority: string) => PRIORITY_FLAG[priority] ?? PRIORITY_FLAG.Low;
const flagTitle = (t: { openFor?: string | null; slaHours?: number; priority: string }) =>
  `Open ${t.openFor ?? ""} — past the ${t.slaHours}-hour target for ${t.priority} priority`;

const PRIORITY_PILL: Record<string, string> = {
  Urgent: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  High: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  Medium: "border-primary/40 bg-primary/15 text-primary",
  Low: "border-outline-variant/60 bg-surface-container-high text-on-surface-variant",
};

/** The five ways an admin actually slices this queue. */
type ChipKey = "open" | "noowner" | "hot" | "late" | "done";
const CHIPS: { key: ChipKey; label: string; dot: string }[] = [
  { key: "open", label: "Everything open", dot: "bg-slate-300" },
  { key: "noowner", label: "No owner", dot: "bg-amber-400" },
  { key: "hot", label: "Urgent or high", dot: "bg-rose-400" },
  { key: "late", label: "Past SLA", dot: "bg-rose-400" },
  { key: "done", label: "Done this month", dot: "bg-emerald-400" },
];

function inThisMonth(d: Date | string | null | undefined) {
  if (!d) return false;
  const x = new Date(d);
  const now = new Date();
  return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
}

type AdminTicketTableProps = {
  tickets: any[];
  admins: any[];
  properties?: { property_id: string; property_name: string }[];
  defaultPropertyId?: string;
};

export default function AdminTicketTable({ tickets, admins }: AdminTicketTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<ChipKey>("open");
  const [owner, setOwner] = useState("ANY");
  const [editingTicket, setEditingTicket] = useState<any>(null);
  // Reading a ticket used to mean opening the Manage form, which is an edit
  // screen — so you could not look at one without being able to change it.
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastState>(null);
  const [modalToast, setModalToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const matchesChip = (t: any, k: ChipKey) => {
    switch (k) {
      case "open":
        return isOpenStatus(t.status);
      case "noowner":
        return isOpenStatus(t.status) && !t.assigned_to;
      case "hot":
        return isOpenStatus(t.status) && (t.priority === "Urgent" || t.priority === "High");
      case "late":
        return !!t.slaBreached;
      case "done":
        return !isOpenStatus(t.status) && inThisMonth(t.modified_at ?? t.created_at);
    }
  };

  // Counts are of the whole property, not of the current search — a chip whose
  // number changed as you typed would be useless as a headline.
  const counts = useMemo(() => {
    const out = {} as Record<ChipKey, number>;
    for (const c of CHIPS) out[c.key] = tickets.filter((t) => matchesChip(t, c.key)).length;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  const visible = tickets.filter((t) => {
    if (!matchesChip(t, chip)) return false;
    if (owner === "NOBODY" && t.assigned_to) return false;
    if (owner !== "ANY" && owner !== "NOBODY" && t.assigned_to !== owner) return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;
    const unitNumber = t.unit?.unit_number || t.lease?.unit?.unit_number || "";
    return (
      t.title.toLowerCase().includes(q) ||
      unitNumber.toLowerCase().includes(q) ||
      (t.location_detail && t.location_detail.toLowerCase().includes(q)) ||
      (t.ticket_category || "").toLowerCase().includes(q) ||
      ticketRef(t).toLowerCase().includes(q) ||
      t.ticket_id.toLowerCase().includes(q)
    );
  });

  const unowned = tickets.filter((t) => isOpenStatus(t.status) && !t.assigned_to);
  const oldestUnowned = unowned.reduce(
    (worst: any, t: any) => (!worst || new Date(t.created_at) < new Date(worst.created_at) ? t : worst),
    null as any
  );

  const whereOf = (t: any) =>
    t.location_type === "Common Area"
      ? t.location_detail || "Common area"
      : `Unit ${t.unit?.unit_number ?? t.lease?.unit?.unit_number ?? "—"}`;

  const nameOf = (id: string | null | undefined) =>
    admins.find((a: any) => a.user_id === id)?.user_name ?? "Nobody yet";

  /* ---------------------------------------------------------------- *
   * Writing from the row
   * ---------------------------------------------------------------- */

  const assign = (ids: string[], to: string | null, label: string) => {
    setBusyId(ids.length === 1 ? ids[0] : "bulk");
    startTransition(async () => {
      const res = await assignTicketsAction(ids, to);
      setBusyId(null);
      if (res.error) {
        setToast({ message: res.error, tone: "error" });
        return;
      }
      setPicked(new Set());
      setToast({ message: label, detail: `${res.ok} ticket${res.ok === 1 ? "" : "s"} updated.` });
    });
  };

  const advance = (t: any, status: string) => {
    setBusyId(t.ticket_id);
    startTransition(async () => {
      const res = await setTicketStatusAction(t.ticket_id, status);
      setBusyId(null);
      if (res.error) {
        setToast({ message: res.error, tone: "error" });
        return;
      }
      setToast({
        message: `${ticketRef(t)} is now “${ticketStateLabel(status)}”.`,
        detail: t.lease?.tenant?.user_name
          ? `${t.lease.tenant.user_name} sees the new state on their ticket.`
          : undefined,
      });
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateTicketAction(formData);
      if (res?.error) {
        setModalToast({ message: res.error, type: "error" });
      } else {
        setModalToast({ message: "Ticket updated.", type: "success" });
        setTimeout(() => {
          setEditingTicket(null);
          setModalToast(null);
        }, 600);
      }
    });
  };

  const menuFor = (t: any): RowMenuItem[] => [
    { label: "Open the ticket", onSelect: () => router.push(`/admin/maintenance/${t.ticket_id}`) },
    { label: "Record cost and what was done", onSelect: () => setEditingTicket(t) },
    ...(t.assigned_to
      ? [
          {
            label: "Take the owner off",
            onSelect: () => assign([t.ticket_id], null, `${ticketRef(t)} has no owner again.`),
            danger: true,
          },
        ]
      : []),
  ];

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="space-y-4">
        {/* The band that carries its own fix. A tile could say five tickets had
            no owner; it could not give them one. */}
        {unowned.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3">
            <span className="material-symbols-outlined shrink-0 text-[20px] text-amber-300">person_add</span>
            <p className="min-w-[280px] flex-[999_1_280px] text-sm leading-relaxed">
              <span className="font-bold text-amber-200">
                {unowned.length} ticket{unowned.length === 1 ? " has" : "s have"} no owner.
              </span>{" "}
              <span className="text-on-surface-variant">
                {oldestUnowned?.openFor ? `The oldest has waited ${oldestUnowned.openFor}. ` : ""}
                Nobody picks these up by themselves.
              </span>
            </p>
            <label htmlFor="bulk-owner" className="text-xs font-semibold text-on-surface-variant">
              Give them all to
            </label>
            <select
              id="bulk-owner"
              value={bulkOwner}
              onChange={(e) => setBulkOwner(e.target.value)}
              className={FIELD}
            >
              <option value="">Choose a person…</option>
              {admins.map((a: any) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.user_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkOwner || isPending}
              onClick={() =>
                assign(
                  unowned.map((t: any) => t.ticket_id),
                  bulkOwner,
                  `All ${unowned.length} went to ${nameOf(bulkOwner)}.`
                )
              }
              className="pressable inline-flex h-10 items-center rounded-xl bg-amber-400 px-4 text-sm font-bold text-[#241a02] transition-colors hover:bg-amber-300 disabled:opacity-40"
            >
              {busyId === "bulk" ? "Assigning…" : `Assign all ${unowned.length}`}
            </button>
          </div>
        )}

        <nav aria-label="Filter tickets" className="flex flex-wrap gap-2">
          {CHIPS.map((c) => {
            const on = chip === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setChip(c.key)}
                className={`pressable inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  on
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-outline-variant/60 bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${c.dot}`} />
                {c.label}
                <span
                  className={`rounded-full px-2 py-px text-[11px] font-bold tabular-nums ${
                    on ? "bg-primary/25 text-primary" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {counts[c.key]}
                </span>
              </button>
            );
          })}
        </nav>

        <Toolbar>
          <SearchField placeholder="Ticket number, unit, or what broke" value={search} onChange={setSearch} />
          <label
            htmlFor="owner-filter"
            className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Owner
          </label>
          <select id="owner-filter" value={owner} onChange={(e) => setOwner(e.target.value)} className={FIELD}>
            <option value="ANY">Anyone</option>
            <option value="NOBODY">Nobody yet</option>
            {admins.map((a: any) => (
              <option key={a.user_id} value={a.user_id}>
                {a.user_name}
              </option>
            ))}
          </select>
        </Toolbar>

        {picked.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/[0.08] px-4 py-2.5">
            <span className="text-sm font-semibold text-on-surface">{picked.size} selected</span>
            <select
              value={bulkOwner}
              onChange={(e) => setBulkOwner(e.target.value)}
              className={FIELD}
              aria-label="Owner for the selected tickets"
            >
              <option value="">Choose a person…</option>
              {admins.map((a: any) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.user_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkOwner || isPending}
              onClick={() => assign([...picked], bulkOwner, `${picked.size} went to ${nameOf(bulkOwner)}.`)}
              className="pressable inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              Assign them
            </button>
            <button
              type="button"
              onClick={() => setPicked(new Set())}
              className="text-sm font-semibold text-on-surface-variant hover:text-white"
            >
              Clear
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-2.5 text-xs text-on-surface-variant">
            <span>
              Showing <span className="font-semibold tabular-nums text-on-surface">{visible.length}</span> of{" "}
              <span className="tabular-nums">{tickets.length}</span> tickets in this property
            </span>
            {(search || chip !== "open" || owner !== "ANY") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setChip("open");
                  setOwner("ANY");
                }}
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                Clear filters
              </button>
            )}
          </div>

          {/* Cards below xl. A ticket row carries five columns plus two
              dropdowns; that needs real width before it stops wrapping. */}
          <div className="divide-y divide-outline-variant/30 xl:hidden">
            {visible.length === 0 ? (
              <EmptyState
                icon="search_off"
                title="No tickets match these filters"
                hint="Try clearing the search or choosing another chip."
              />
            ) : (
              visible.map((t: any) => {
                const key = ticketStateKey(t.status);
                const unassigned = isOpenStatus(t.status) && !t.assigned_to;
                return (
                  <div
                    key={t.ticket_id}
                    className={`border-l-2 px-4 py-3.5 ${
                      unassigned
                        ? "border-rose-400/70 bg-rose-500/[0.04]"
                        : t.slaBreached
                        ? flagFor(t.priority).rail
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/admin/maintenance/${t.ticket_id}`} className="min-w-0 text-left">
                        <span className="font-mono text-[11px] font-bold tracking-wide text-on-surface-variant">
                          {ticketRef(t)}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold leading-snug text-white">{t.title}</span>
                      </Link>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Low
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-[13px] leading-none">
                        {t.location_type === "Common Area" ? "domain" : "meeting_room"}
                      </span>
                      <span className="truncate">{whereOf(t)}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{t.ticket_category}</span>
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`rounded-md border px-2 py-0.5 font-semibold ${TICKET_STATE_TONE[key]}`}>
                        {ticketStateLabel(t.status)}
                      </span>
                      {t.openFor && (
                        <span
                          className={`font-medium tabular-nums ${
                            t.slaBreached ? "text-rose-300" : "text-on-surface-variant"
                          }`}
                        >
                          waiting {t.openFor}
                        </span>
                      )}
                      {t.messageCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                          <span className="material-symbols-outlined text-[13px] leading-none">forum</span>
                          {t.messageCount}
                        </span>
                      )}
                    </div>

                    {/* One primary action at thumb height: the thing this
                        ticket is actually waiting for. */}
                    <div className="mt-3 flex items-center gap-2">
                      {unassigned ? (
                        <select
                          aria-label={`Owner for ${ticketRef(t)}`}
                          value=""
                          disabled={isPending}
                          onChange={(e) =>
                            e.target.value &&
                            assign([t.ticket_id], e.target.value, `${ticketRef(t)} went to ${nameOf(e.target.value)}.`)
                          }
                          className="h-11 flex-1 rounded-xl border border-dashed border-rose-400/60 bg-rose-500/10 px-3 text-sm font-bold text-rose-200 outline-none"
                        >
                          <option value="">+ Assign someone</option>
                          {admins.map((a: any) => (
                            <option key={a.user_id} value={a.user_id}>
                              {a.user_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          aria-label={`State of ${ticketRef(t)}`}
                          value={TICKET_STATUS_OPTIONS.find((o) => o.key === key)?.value ?? t.status}
                          disabled={isPending}
                          onChange={(e) => advance(t, e.target.value)}
                          className="h-11 flex-1 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-sm font-semibold text-on-surface outline-none"
                        >
                          {TICKET_STATUS_OPTIONS.map((o) => (
                            <option key={o.key} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <RowMenu label={`More for ${ticketRef(t)}`} items={menuFor(t)} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden xl:block">
            <div className={TABLE.wrap}>
              <table className={TABLE.table + " min-w-[1060px]"}>
                <caption className="sr-only">Tickets in this property</caption>
                <thead>
                  <tr>
                    <th className={TABLE.th + " w-10"}>
                      <span className="sr-only">Select</span>
                    </th>
                    <th className={TABLE.th}>Ticket</th>
                    <th className={TABLE.th}>What is wrong</th>
                    <th className={TABLE.th}>Waiting</th>
                    <th className={TABLE.th}>Who is on it</th>
                    <th className={TABLE.th}>Where it is up to</th>
                    <th className={TABLE.thNum}>
                      <span className="sr-only">More</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <EmptyState
                          icon="search_off"
                          title="No tickets match these filters"
                          hint="Try clearing the search or choosing another chip."
                        />
                      </td>
                    </tr>
                  ) : (
                    visible.map((t: any) => {
                      const key = ticketStateKey(t.status);
                      const unassigned = isOpenStatus(t.status) && !t.assigned_to;
                      const busy = busyId === t.ticket_id;
                      return (
                        <tr key={t.ticket_id} className={TABLE.tr + (unassigned ? " bg-rose-500/[0.035]" : "")}>
                          <td className={TABLE.td}>
                            {isOpenStatus(t.status) && (
                              <input
                                type="checkbox"
                                checked={picked.has(t.ticket_id)}
                                onChange={() => togglePick(t.ticket_id)}
                                aria-label={`Select ${ticketRef(t)}`}
                                className="h-4 w-4 accent-[#d0bcff]"
                              />
                            )}
                          </td>

                          <td
                            className={
                              TABLE.td +
                              " border-l-2 align-top " +
                              (t.slaBreached ? flagFor(t.priority).rail : "border-transparent")
                            }
                          >
                            <span className="flex items-center gap-1.5">
                              {t.slaBreached && (
                                <span
                                  className={`material-symbols-outlined shrink-0 text-[15px] leading-none ${
                                    flagFor(t.priority).icon
                                  }`}
                                  title={flagTitle(t)}
                                  aria-label={flagTitle(t)}
                                  role="img"
                                >
                                  timer_off
                                </span>
                              )}
                              {/* The ticket has a page now (DEV-266). */}
                              <Link
                                href={`/admin/maintenance/${t.ticket_id}`}
                                className="whitespace-nowrap border-b border-primary/35 pb-px font-mono text-xs font-bold text-on-surface hover:text-primary"
                              >
                                {ticketRef(t)}
                              </Link>
                            </span>
                            <span
                              className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.Low
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>

                          <td className={TABLE.td + " max-w-[340px] align-top"}>
                            <div className="font-semibold text-on-surface">{t.title}</div>
                            <div className="mt-0.5 text-[11px] text-on-surface-variant">
                              {whereOf(t)} · {t.ticket_category}
                            </div>
                            {t.remark ? (
                              <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                                <span className="material-symbols-outlined shrink-0 text-[13px]">sticky_note_2</span>
                                <span className="truncate">{t.remark}</span>
                              </div>
                            ) : t.messageCount > 0 ? (
                              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                                <span className="material-symbols-outlined text-[13px]">forum</span>
                                <span>
                                  {t.messageCount} message{t.messageCount === 1 ? "" : "s"}
                                </span>
                              </div>
                            ) : null}
                          </td>

                          <td className={TABLE.td + " align-top"}>
                            <div
                              className={`font-bold tabular-nums ${t.slaBreached ? "text-rose-300" : "text-on-surface"}`}
                            >
                              {t.openFor ?? "—"}
                            </div>
                            <div
                              className={`mt-0.5 text-[11px] ${
                                t.slaBreached ? "text-rose-300" : "text-on-surface-variant"
                              }`}
                            >
                              {!isOpenStatus(t.status)
                                ? `closed ${dayMonth(t.modified_at ?? t.created_at)}`
                                : t.slaBreached
                                ? `past the ${t.slaHours}h target`
                                : "within target"}
                            </div>
                          </td>

                          <td className={TABLE.td + " min-w-[160px] align-top"}>
                            <select
                              aria-label={`Owner for ${ticketRef(t)}`}
                              value={t.assigned_to ?? ""}
                              disabled={isPending}
                              onChange={(e) =>
                                assign(
                                  [t.ticket_id],
                                  e.target.value || null,
                                  e.target.value
                                    ? `${ticketRef(t)} went to ${nameOf(e.target.value)}.`
                                    : `${ticketRef(t)} has no owner again.`
                                )
                              }
                              className={`h-9 w-full rounded-lg border px-2 text-xs outline-none transition-colors ${
                                unassigned
                                  ? "border-dashed border-rose-400/60 bg-rose-500/10 font-bold text-rose-200"
                                  : "border-outline-variant/60 bg-surface-container-high text-on-surface"
                              } ${busy ? "opacity-50" : ""}`}
                            >
                              <option value="">Nobody yet</option>
                              {admins.map((a: any) => (
                                <option key={a.user_id} value={a.user_id}>
                                  {a.user_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className={TABLE.td + " min-w-[170px] align-top"}>
                            <span className="flex items-center gap-2">
                              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${TICKET_STATE_DOT[key]}`} />
                              <select
                                aria-label={`State of ${ticketRef(t)}`}
                                value={TICKET_STATUS_OPTIONS.find((o) => o.key === key)?.value ?? t.status}
                                disabled={isPending}
                                onChange={(e) => advance(t, e.target.value)}
                                className={`h-9 w-full rounded-lg border px-2 text-xs font-semibold outline-none transition-colors ${
                                  TICKET_STATE_TONE[key]
                                } ${busy ? "opacity-50" : ""}`}
                              >
                                {TICKET_STATUS_OPTIONS.map((o) => (
                                  <option key={o.key} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </span>
                          </td>

                          <td className={TABLE.tdNum + " align-top"}>
                            <RowMenu label={`More for ${ticketRef(t)}`} items={menuFor(t)} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {detailTicketId && <TicketDetailModal ticketId={detailTicketId} onClose={() => setDetailTicketId(null)} />}

      {/* Close-out: cost and what was done. Owner and state moved to the row,
          so this modal is now only the parts that need typing. */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-card flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-outline-variant shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low p-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">edit_document</span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Close out a ticket</h3>
                <span className="rounded bg-surface-variant px-2 py-0.5 font-mono text-xs font-semibold text-on-surface-variant">
                  {ticketRef(editingTicket)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTicket(null);
                  setModalToast(null);
                }}
                className="p-1 text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-5">
              {modalToast && (
                <div
                  className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-semibold ${
                    modalToast.type === "success"
                      ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                      : "border-rose-500/40 bg-rose-500/20 text-rose-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {modalToast.type === "success" ? "check_circle" : "error"}
                  </span>
                  <span>{modalToast.message}</span>
                </div>
              )}

              <input type="hidden" name="ticket_id" value={editingTicket.ticket_id} />
              <input type="hidden" name="assigned_to" value={editingTicket.assigned_to || ""} />

              <div className="space-y-1.5 rounded-xl border border-outline-variant/30 bg-surface-container-high/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-on-surface">{editingTicket.title}</div>
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {editingTicket.ticket_category}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-cyan-300">
                  <span className="material-symbols-outlined text-[15px]">
                    {editingTicket.location_type === "Common Area" ? "domain" : "meeting_room"}
                  </span>
                  <span>{whereOf(editingTicket)}</span>
                </div>
                <div className="line-clamp-3 border-t border-outline-variant/20 pt-1 text-on-surface-variant">
                  {editingTicket.description}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">State</label>
                <select
                  name="status"
                  defaultValue={
                    TICKET_STATUS_OPTIONS.find((o) => o.key === ticketStateKey(editingTicket.status))?.value ??
                    editingTicket.status
                  }
                  className="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-sm font-semibold text-on-surface outline-none focus:border-primary"
                >
                  {TICKET_STATUS_OPTIONS.map((o) => (
                    <option key={o.key} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface-variant">What it cost (RM)</label>
                <input
                  type="number"
                  name="cost"
                  step="0.01"
                  min="0"
                  defaultValue={editingTicket.cost ? Number(editingTicket.cost) : ""}
                  placeholder="0.00"
                  className="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 font-mono text-sm text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="flex items-center justify-between text-xs font-medium text-on-surface-variant">
                  <span>What was done</span>
                  {/* The placeholder invited internal notes; the resident reads
                      this field on their own ticket (R11). */}
                  <span className="text-[10px] font-normal text-amber-300/90">The resident sees this</span>
                </label>
                <textarea
                  name="remark"
                  defaultValue={editingTicket.remark || ""}
                  placeholder="e.g. Replaced the tap washer. Please tell us if it still drips."
                  rows={2}
                  className="resize-none rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t border-outline-variant/30 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTicket(null);
                    setModalToast(null);
                  }}
                  disabled={isPending}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-variant disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pressable flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isPending ? "progress_activity" : "check"}
                  </span>
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
