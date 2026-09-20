"use client";

import { useEffect, useState } from "react";
import { ViewerButton } from "@/components/ui/MediaViewer";
import Modal from "@/components/admin/Modal";
import { BTN } from "@/components/admin/ui";
import { adminTicketReply, adminTicketThread, ticketDetailAction } from "@/app/admin/maintenance/actions";
import TicketConversation from "./TicketConversation";
import type { ThreadMessage } from "@/lib/ticket-thread";

/**
 * One ticket, read-only, with the conversation beside it.
 *
 * It used to be a phone-shaped column on every screen (user: "i understand
 * this design for mobile view, but why desktop also pop out mobile view?") and
 * the facts were label-on-the-left / value-on-the-right rows stretched across
 * it. On a wide screen the detail now sits on the left and the conversation on
 * the right; on a phone they stack, in that order (DEV-196).
 */

type TicketDetail = {
  ticket_id: string;
  title: string;
  description: string;
  ticket_category: string;
  priority: string;
  status: string;
  location_type: string;
  location_detail: string | null;
  remark: string | null;
  cost: number | null;
  created_at: string | null;
  resolved_at: string | null;
  unitNumber: string | null;
  propertyName: string | null;
  reporterName: string | null;
  assigneeName: string | null;
  photos?: { id: string; name: string }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "06 Sep 2026, 20:08" in Malaysia time - ICU prints "Sept" (DEV-184). */
function fmt(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(d)
    .split("-")
    .map(Number);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(d);
  return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]} ${y}, ${time}`;
}

const PRIORITY_CHIP: Record<string, string> = {
  Urgent: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  High: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  Medium: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Low: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
};

const STATUS_CHIP: Record<string, string> = {
  Open: "bg-amber-400/15 text-amber-300 border-amber-400/40",
  "In Progress": "bg-primary/20 text-primary border-primary/40",
  "Pending Parts": "bg-rose-500/15 text-rose-300 border-rose-500/40",
  KIV: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Closed: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
};

/** A fact, label above value - readable at any width, unlike a stretched row. */
function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-on-surface" title={typeof children === "string" ? children : undefined}>
        {children}
      </dd>
    </div>
  );
}

export default function TicketDetailModal({
  ticketId,
  onClose,
  showHelpdeskLink = false,
}: {
  ticketId: string;
  onClose: () => void;
  /** Only true away from the Helpdesk page - on it, the link goes nowhere new. */
  showHelpdeskLink?: boolean;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);

  const loadThread = () =>
    adminTicketThread(ticketId)
      .then((res: any) => setMessages(res?.thread?.messages ?? []))
      .catch(() => setMessages([]));

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    let live = true;
    ticketDetailAction(ticketId).then((res: any) => {
      if (!live) return;
      if (res?.error) setError(res.error);
      else setTicket(res.ticket);
    });
    return () => {
      live = false;
    };
  }, [ticketId]);

  const where =
    ticket?.location_type === "Common Area"
      ? ticket?.location_detail || "Common area"
      : ticket?.unitNumber
      ? `Unit ${ticket.unitNumber}`
      : "—";

  return (
    <Modal
      title={ticket?.title ?? "Loading…"}
      subtitle={ticket ? `${ticket.ticket_category} · #${ticket.ticket_id.split("-")[0].toUpperCase()}` : undefined}
      icon="build"
      size="xl"
      onClose={onClose}
      footer={
        <>
          {showHelpdeskLink && (
            <a href="/admin/maintenance" className={`${BTN.ghost} mr-auto`}>
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Open in Helpdesk
            </a>
          )}
          <button type="button" onClick={onClose} className={BTN.secondary}>
            Close
          </button>
        </>
      }
    >
      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <span className="material-symbols-outlined text-[16px] leading-none">error</span>
          {error}
        </p>
      )}

      {!ticket && !error && <p className="py-8 text-center text-sm text-on-surface-variant">Loading…</p>}

      {ticket && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
          {/* ── what it is ───────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${PRIORITY_CHIP[ticket.priority] ?? PRIORITY_CHIP.Low}`}>
                {ticket.priority}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[ticket.status] ?? STATUS_CHIP.Closed}`}>
                {ticket.status}
              </span>
            </div>

            <section className="rounded-xl border border-outline-variant/40 bg-surface-container-high/40 p-3.5">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                What was reported
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">{ticket.description}</p>
              {ticket.photos && ticket.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ticket.photos.map((p, idx) => (
                    <ViewerButton
                      key={p.id}
                      items={ticket.photos!.map((x) => ({ src: `/api/tickets/attachments/${x.id}`, title: x.name }))}
                      start={idx}
                      className="block h-20 w-20 overflow-hidden rounded-lg border border-outline-variant/60 hover:border-primary"
                      title={p.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/tickets/attachments/${p.id}`} alt={p.name} className="h-full w-full object-cover" />
                    </ViewerButton>
                  ))}
                </div>
              )}
            </section>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-outline-variant/40 p-3.5">
              <Fact label="Where">{where}</Fact>
              <Fact label="Property">{ticket.propertyName ?? "—"}</Fact>
              <Fact label="Reported by">{ticket.reporterName ?? "—"}</Fact>
              <Fact label="Assigned to">
                {ticket.assigneeName ?? <span className="text-amber-300">Nobody yet</span>}
              </Fact>
              <Fact label="Raised">
                <span className="tabular-nums">{fmt(ticket.created_at)}</span>
              </Fact>
              {ticket.resolved_at && (
                <Fact label="Resolved">
                  <span className="tabular-nums text-emerald-300">{fmt(ticket.resolved_at)}</span>
                </Fact>
              )}
              {ticket.cost !== null && ticket.cost > 0 && (
                <Fact label="Cost">
                  <span className="tabular-nums">RM {ticket.cost.toFixed(2)}</span>
                </Fact>
              )}
            </dl>

            {ticket.remark && (
              <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  What was done
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-100/90">{ticket.remark}</p>
              </section>
            )}
          </div>

          {/* ── talking to the resident ──────────────────────────────── */}
          <div className="rounded-xl border border-outline-variant/40 bg-surface-container-high/20 p-3.5 lg:max-h-[62vh] lg:overflow-y-auto">
            {messages === null ? (
              <p className="text-sm text-on-surface-variant">Loading conversation…</p>
            ) : (
              <TicketConversation
                ticketId={ticket.ticket_id}
                messages={messages}
                replyAction={adminTicketReply}
                onSent={loadThread}
                canReply
                viewerIsOffice
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
