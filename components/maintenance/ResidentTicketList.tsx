"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";

export type ResidentTicket = {
  id: string;
  shortId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  remark: string | null;
  reported: string; // "11 Sep 2026"
  resolved: string | null;
  where: string;
  isCommonArea: boolean;
  photos: { id: string; name: string }[];
};

const DONE = new Set(["Resolved", "Closed"]);

const STRIPE: Record<string, string> = {
  Open: "bg-sky-400",
  "In Progress": "bg-primary",
  "Pending Parts": "bg-amber-400",
  KIV: "bg-amber-400",
  Resolved: "bg-emerald-400",
  Closed: "bg-outline-variant",
};

/**
 * Resident helpdesk list (DEV-187; user: "The helpdesk look so crowded and not
 * organised well"). Before: every card printed the full description, the full
 * management remark and a monospace footer, all at the same weight, in one
 * long list. Now: Active / Resolved / All tabs, compact cards (status stripe,
 * two-line title and description, photo thumbnails) that expand on tap to
 * show everything.
 */
export default function ResidentTicketList({ tickets }: { tickets: ResidentTicket[] }) {
  const active = tickets.filter((t) => !DONE.has(t.status));
  const done = tickets.filter((t) => DONE.has(t.status));
  const [tab, setTab] = useState<"active" | "done" | "all">(active.length > 0 ? "active" : "all");
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => (tab === "active" ? active : tab === "done" ? done : tickets), [tab, tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { id: typeof tab; label: string; count: number }[] = [
    { id: "active", label: "Active", count: active.length },
    { id: "done", label: "Resolved", count: done.length },
    { id: "all", label: "All", count: tickets.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5 bg-surface-container-high p-1.5 rounded-2xl border border-outline-variant/40">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all pressable ${
              tab === t.id ? "bg-primary text-black shadow" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t.label}
            <span className={`text-[11px] px-1.5 rounded-full ${tab === t.id ? "bg-black/20" : "bg-surface-container-highest"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[36px] opacity-50">
            {tab === "active" ? "task_alt" : "inbox"}
          </span>
          <p className="text-sm mt-1">
            {tab === "active" ? "Nothing outstanding - all your requests are resolved." : "No requests here yet."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((t) => {
          const expanded = open === t.id;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(expanded ? null : t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(expanded ? null : t.id);
                }
              }}
              aria-expanded={expanded}
              className={`relative text-left cursor-pointer rounded-2xl glass-card border overflow-hidden pl-5 pr-4 py-4 flex flex-col gap-2 transition-colors ${
                expanded ? "border-primary/50" : "border-outline-variant/40 hover:border-primary/40"
              }`}
            >
              <span aria-hidden className={`absolute left-0 inset-y-0 w-1.5 ${STRIPE[t.status] ?? "bg-outline-variant"}`} />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-primary truncate">
                    {t.category} <span className="text-on-surface-variant font-normal">· #{t.shortId}</span>
                  </p>
                  <h3 className={`text-base font-bold text-on-surface leading-snug mt-0.5 ${expanded ? "" : "line-clamp-2"}`}>
                    {t.title}
                  </h3>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <p className={`text-sm text-on-surface/80 ${expanded ? "whitespace-pre-wrap" : "line-clamp-2"}`}>{t.description}</p>

              {t.photos.length > 0 && (
                <div className="flex gap-2">
                  {t.photos.map((p) => (
                    <a
                      key={p.id}
                      href={`/api/tickets/attachments/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block w-14 h-14 rounded-lg overflow-hidden border border-outline-variant/60"
                      title={p.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/tickets/attachments/${p.id}`} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {t.remark && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-amber-300 mt-0.5">support_agent</span>
                  <p className={`text-xs text-amber-100 ${expanded ? "" : "line-clamp-1"}`}>
                    <span className="font-bold text-amber-300">Management: </span>
                    {t.remark}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-outline-variant/25 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1 min-w-0">
                  <span className={`material-symbols-outlined text-[15px] ${t.isCommonArea ? "text-cyan-300" : "text-primary"}`}>
                    {t.isCommonArea ? "domain" : "meeting_room"}
                  </span>
                  <span className="truncate">{t.where}</span>
                </span>
                <span className="shrink-0">
                  {t.resolved ? `Resolved ${t.resolved}` : `Reported ${t.reported}`}
                </span>
              </div>
              {!expanded && (t.description.length > 90 || !!t.remark) && (
                <span className="text-[11px] text-primary font-semibold -mt-1">Tap for details</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
