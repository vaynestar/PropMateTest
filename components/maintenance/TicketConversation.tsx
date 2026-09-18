"use client";

import { useRef, useState, useTransition } from "react";
import { ViewerButton } from "@/components/ui/MediaViewer";
import TicketPhotoPicker from "./TicketPhotoPicker";
import type { ThreadMessage, ThreadPhoto } from "@/lib/ticket-thread";

export function PhotoStrip({ photos, size = "w-16 h-16" }: { photos: ThreadPhoto[]; size?: string }) {
  if (!photos.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p, idx) => (
        <ViewerButton
          key={p.id}
          items={photos.map((x) => ({ src: `/api/tickets/attachments/${x.id}`, title: x.name }))}
          start={idx}
          className={`block ${size} rounded-lg overflow-hidden border border-outline-variant/60 hover:border-primary`}
          title={p.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/tickets/attachments/${p.id}`} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
        </ViewerButton>
      ))}
    </div>
  );
}

/**
 * The message thread on a helpdesk request (DEV-189) - shared by the resident
 * pop-up and the admin ticket modal. Office messages sit on the left in the
 * primary tint, the viewer's own on the right; each can carry photos.
 */
export default function TicketConversation({
  ticketId,
  messages,
  replyAction,
  onSent,
  canReply,
  closedNote,
  viewerIsOffice,
}: {
  ticketId: string;
  messages: ThreadMessage[];
  replyAction: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>;
  onSent: () => void;
  canReply: boolean;
  closedNote?: string;
  viewerIsOffice: boolean;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      try {
        const res = await replyAction(fd);
        if (res.error) return setError(res.error);
        formRef.current?.reset();
        setResetKey((n) => n + 1);
        onSent();
      } catch {
        setError("Couldn't send - check your connection and try again. Your message is still here.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-primary">forum</span>
        Conversation {messages.length > 0 && `(${messages.length})`}
      </h4>

      {messages.length === 0 && (
        <p className="text-xs text-on-surface-variant rounded-xl border border-dashed border-outline-variant/50 p-3 text-center">
          No messages yet.{" "}
          {viewerIsOffice ? "Reply to let the resident know what's happening." : "The management office will reply here."}
        </p>
      )}

      <ol className="flex flex-col gap-2.5">
        {messages.map((m) => (
          <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 flex flex-col gap-2 border ${
                m.fromOffice
                  ? "bg-primary/12 border-primary/30 rounded-tl-md"
                  : "bg-surface-container-high border-outline-variant/50 rounded-tr-md"
              }`}
            >
              <p className="text-[11px] font-bold flex items-center gap-1">
                <span className={`material-symbols-outlined text-[14px] ${m.fromOffice ? "text-primary" : "text-sky-300"}`}>
                  {m.fromOffice ? "support_agent" : "person"}
                </span>
                <span className={m.fromOffice ? "text-primary" : "text-sky-200"}>{m.mine ? "You" : m.author}</span>
                <span className="font-normal text-on-surface-variant">· {m.at}</span>
              </p>
              {m.text !== "(photo)" && <p className="text-sm text-on-surface whitespace-pre-wrap">{m.text}</p>}
              <PhotoStrip photos={m.photos} />
            </div>
          </li>
        ))}
      </ol>

      {canReply ? (
        <form ref={formRef} onSubmit={submit} className="flex flex-col gap-2 rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-3">
          <input type="hidden" name="ticket_id" value={ticketId} />
          <textarea
            name="message"
            rows={2}
            maxLength={2000}
            placeholder={viewerIsOffice ? "Reply to the resident…" : "Add a message for the management office…"}
            className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary resize-none"
          />
          <TicketPhotoPicker onBusyChange={setBusy} resetKey={resetKey} />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={pending || busy}
            className="btn-primary self-end px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 pressable"
          >
            <span className="material-symbols-outlined text-[18px]">{pending ? "progress_activity" : "send"}</span>
            {busy ? "Uploading…" : pending ? "Sending…" : "Send"}
          </button>
        </form>
      ) : (
        closedNote && <p className="text-xs text-on-surface-variant text-center">{closedNote}</p>
      )}
    </div>
  );
}
