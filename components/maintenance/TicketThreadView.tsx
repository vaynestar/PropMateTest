"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { adminTicketReply } from "@/app/admin/maintenance/actions";
import type { ThreadMessage, ThreadPhoto } from "@/lib/ticket-thread";
import { PhotoStrip } from "./TicketConversation";

/**
 * The conversation on a ticket (DEV-266).
 *
 * **Reply and internal note are two buttons, not one field.** There is no
 * way back from telling a resident what you meant to write to a colleague,
 * so the choice is made before the typing rather than after it — and the
 * composer changes colour, placeholder and send button to match.
 *
 * An internal note is filtered out of a resident's copy of the thread in the
 * query itself (`lib/ticket-thread.ts`), not here: a hidden element is not
 * privacy when the text is already in their browser.
 */
export default function TicketThreadView({
  ticketId,
  messages,
  description,
  photos,
  residentName,
}: {
  ticketId: string;
  messages: ThreadMessage[];
  description: string;
  /**
   * What the resident photographed when they reported it (DEV-283).
   *
   * `getTicketThread` has always returned these, on the report and on every
   * message, and this view dropped them — so a resident could send a picture
   * of the leak and the office saw only the words. The resident's own copy of
   * the thread rendered them the whole time, which is how it went unnoticed.
   * Same `PhotoStrip`, same viewer, same attachment route.
   */
  photos: ThreadPhoto[];
  residentName: string;
}) {
  const router = useRouter();
  const [internal, setInternal] = useState(false);
  const [text, setText] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const send = () => {
    if (!text.trim()) {
      setToast({ message: "Write something first.", tone: "error" });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ticket_id", ticketId);
      fd.set("message", text);
      fd.set("internal", internal ? "true" : "false");
      const res = await adminTicketReply(fd);
      if (res.error) {
        setToast({ message: res.error, tone: "error" });
        return;
      }
      setText("");
      router.refresh();
      setToast({
        message: internal ? "Note saved for the office." : `Sent. ${residentName} sees it in the app.`,
      });
    });
  };

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
        <div className="border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-3">
          <h2 className="text-[15px] font-bold text-on-surface">What has happened</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Everything said and done, oldest first. The resident sees the messages, not the internal notes.
          </p>
        </div>

        <ol className="flex list-none flex-col gap-3.5 px-4 py-4">
          {/* The original report is the first thing that happened, and it was
              not in the thread at all — it sat in a separate description box
              above it, so the story started in the middle. */}
          <li className="flex items-start gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-[11px] font-extrabold text-on-surface-variant">
              {initials(residentName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-bold text-on-surface">{residentName}</span>
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-px text-[10px] font-bold text-sky-300">
                  Reported it
                </span>
              </div>
              <div className="mt-1.5 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3 py-2.5 text-[13px] leading-relaxed text-on-surface">
                {description}
              </div>
              {photos.length > 0 && (
                <div className="mt-2">
                  <PhotoStrip photos={photos} size="h-20 w-20" />
                </div>
              )}
            </div>
          </li>

          {messages.map((m) => (
            <li key={m.id} className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-[11px] font-extrabold text-on-surface-variant">
                {initials(m.author)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-bold text-on-surface">{m.author}</span>
                  <span
                    className={`rounded-full border px-2 py-px text-[10px] font-bold ${
                      m.internal
                        ? "border-outline-variant bg-surface-container-highest text-on-surface-variant"
                        : m.fromOffice
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    }`}
                  >
                    {m.internal ? "Internal note" : m.fromOffice ? "Office" : "Resident"}
                  </span>
                  <span className="ml-auto text-[11px] text-on-surface-variant">{m.at}</span>
                </div>
                <div
                  className={`mt-1.5 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${
                    m.internal
                      ? "border border-dashed border-outline-variant bg-surface-container-highest/40 text-on-surface-variant"
                      : "border border-outline-variant/50 bg-surface-container-high text-on-surface"
                  }`}
                >
                  {m.text}
                </div>
                {m.photos.length > 0 && (
                  <div className="mt-2">
                    <PhotoStrip photos={m.photos} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="px-4 pb-4">
          <div
            className={`overflow-hidden rounded-xl border transition-colors ${
              internal
                ? "border-dashed border-outline-variant bg-surface-container-highest/30"
                : "border-outline-variant/60 bg-surface-container-high"
            }`}
          >
            <div className="flex gap-1 border-b border-outline-variant/40 p-1.5">
              {([
                { on: false, label: "Reply to the resident" },
                { on: true, label: "Internal note" },
              ]).map((t) => (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={internal === t.on}
                  onClick={() => setInternal(t.on)}
                  className={`pressable h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
                    internal === t.on
                      ? "bg-primary/15 text-primary"
                      : "text-on-surface-variant hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label htmlFor="ticket-reply" className="sr-only">
              Your reply
            </label>
            <textarea
              id="ticket-reply"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder={
                internal
                  ? "Only the office sees this. The resident never will."
                  : `${residentName} will see this.`
              }
              className="w-full resize-y bg-transparent px-3.5 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
            />

            <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/40 px-3.5 py-2.5">
              <span className="text-[11px] text-on-surface-variant">
                {internal
                  ? "Kept on the ticket, shown only to the office."
                  : /* No mail transport — saying "and by email" would be a
                       promise the code does not keep. */
                    "The resident is notified in the app."}
              </span>
              <button
                type="button"
                onClick={send}
                disabled={isPending || !text.trim()}
                className={`pressable ml-auto inline-flex h-10 items-center rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-40 ${
                  internal
                    ? "border border-outline-variant bg-surface-container-highest text-on-surface"
                    : "bg-primary text-on-primary hover:bg-primary/90"
                }`}
              >
                {isPending ? "Saving…" : internal ? "Save the note" : "Send the reply"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
