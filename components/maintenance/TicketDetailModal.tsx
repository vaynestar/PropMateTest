"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ticketDetailAction } from "@/app/admin/maintenance/actions";

/**
 * Read-only view of one ticket.
 *
 * The list showed a truncated title and a two-line remark, and the only way to
 * see the rest was the Manage form — which is an edit screen, so reading a
 * ticket meant opening something you could accidentally change. On a phone the
 * table cut the description off entirely.
 *
 * Portalled to document.body: the dashboard renders these inside a card that
 * sits under a backdrop-filtered header, and a backdrop-filter captures
 * position: fixed descendants (DEV-159).
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
};

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

const PRIORITY_CHIP: Record<string, string> = {
  Urgent: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  High: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  Medium: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Low: "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline-variant/25 py-2 last:border-0">
      <span className="shrink-0 text-[11px] text-on-surface-variant">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium text-on-surface">{children}</span>
    </div>
  );
}

export default function TicketDetailModal({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-outline-variant/80 bg-surface-container shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 bg-surface-container-high/40 px-5 py-4">
          <div className="min-w-0">
            <span className="block text-[11px] text-on-surface-variant">Ticket</span>
            <h3 className="text-sm font-bold leading-snug text-white">
              {ticket?.title ?? "Loading…"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <span className="material-symbols-outlined text-[16px] leading-none">error</span>
              {error}
            </p>
          )}

          {!ticket && !error && (
            <p className="py-6 text-center text-xs text-on-surface-variant">Loading…</p>
          )}

          {ticket && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    PRIORITY_CHIP[ticket.priority] ?? PRIORITY_CHIP.Low
                  }`}
                >
                  {ticket.priority}
                </span>
                <span className="rounded-full border border-outline-variant/60 bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                  {ticket.status}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {ticket.ticket_category}
                </span>
              </div>

              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-high/40 p-3">
                <span className="mb-1 block text-[11px] font-semibold text-on-surface-variant">
                  What was reported
                </span>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-on-surface">
                  {ticket.description}
                </p>
              </div>

              <div className="mt-4">
                <Row label="Where">
                  {ticket.location_type === "Common Area"
                    ? ticket.location_detail || "Common area"
                    : ticket.unitNumber
                    ? `Unit ${ticket.unitNumber}`
                    : "—"}
                </Row>
                <Row label="Property">{ticket.propertyName ?? "—"}</Row>
                <Row label="Reported by">{ticket.reporterName ?? "—"}</Row>
                <Row label="Assigned to">
                  {ticket.assigneeName ?? (
                    <span className="text-amber-300">Nobody yet</span>
                  )}
                </Row>
                <Row label="Raised">{fmt(ticket.created_at)}</Row>
                {ticket.resolved_at && <Row label="Resolved">{fmt(ticket.resolved_at)}</Row>}
                {ticket.cost !== null && ticket.cost > 0 && (
                  <Row label="Cost">RM {ticket.cost.toFixed(2)}</Row>
                )}
              </div>

              {ticket.remark && (
                <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                  <span className="mb-1 block text-[11px] font-semibold text-emerald-300">
                    What was done
                  </span>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-emerald-100/90">
                    {ticket.remark}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-outline-variant/40 bg-surface-container-high/40 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
          <a
            href="/admin/maintenance"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Open in Helpdesk
          </a>
          <button
            type="button"
            onClick={onClose}
            className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
