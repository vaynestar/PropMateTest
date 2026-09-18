"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import StatusBadge from "@/components/dashboard/StatusBadge";
import TicketConversation, { PhotoStrip } from "./TicketConversation";
import { residentTicketReply, residentTicketThread } from "@/app/resident/maintenance/thread-actions";
import type { TicketThread } from "@/lib/ticket-thread";

/**
 * A resident's helpdesk request in full (DEV-189; user: "tap details should
 * open a pop out window with all previous comment as well and attachment if
 * any"). Bottom sheet on a phone, centred dialog on a wider screen.
 */
export default function ResidentTicketModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const load = useCallback(() => {
    residentTicketThread(ticketId)
      .then((res) => (res.thread ? setThread(res.thread) : setError(res.error ?? "Couldn't open this request.")))
      .catch(() => setError("Couldn't reach the server. Check your connection and try again."));
  }, [ticketId]);

  useEffect(() => {
    setMounted(true);
    load();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [load, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl bg-surface-container border border-outline-variant/60 shadow-2xl animate-slide-up pb-[env(safe-area-inset-bottom)]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 bg-surface-container/95 backdrop-blur border-b border-outline-variant/40">
          <span className="text-xs font-semibold text-on-surface-variant">
            Request {thread ? `#${thread.shortId}` : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {!thread && !error && (
            <p className="text-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              Opening request…
            </p>
          )}
          {error && <p className="text-sm text-rose-300">{error}</p>}

          {thread && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-primary">{thread.category}</p>
                  <StatusBadge status={thread.status} />
                </div>
                <h3 className="text-xl font-bold text-on-surface leading-snug">{thread.title}</h3>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-surface-container-high/60 p-3">
                  <dt className="text-on-surface-variant">Where</dt>
                  <dd className="font-semibold text-on-surface mt-0.5 flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[15px] ${thread.isCommonArea ? "text-cyan-300" : "text-primary"}`}>
                      {thread.isCommonArea ? "domain" : "meeting_room"}
                    </span>
                    {thread.where}
                  </dd>
                </div>
                <div className="rounded-xl bg-surface-container-high/60 p-3">
                  <dt className="text-on-surface-variant">{thread.resolved ? "Resolved" : "Reported"}</dt>
                  <dd className="font-semibold text-on-surface mt-0.5">{thread.resolved ?? thread.reported}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">What you reported</h4>
                <p className="text-sm text-on-surface whitespace-pre-wrap">{thread.description}</p>
                <PhotoStrip photos={thread.photos} size="w-20 h-20" />
              </div>

              {thread.remark && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2.5 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-300">support_agent</span>
                  <p className="text-sm text-amber-100">
                    <span className="font-bold text-amber-300 block text-xs">Latest update from management</span>
                    {thread.remark}
                  </p>
                </div>
              )}

              <TicketConversation
                ticketId={thread.id}
                messages={thread.messages}
                replyAction={residentTicketReply}
                onSent={load}
                canReply={!thread.closed}
                closedNote="This request is closed. Raise a new request if the problem comes back."
                viewerIsOffice={false}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
