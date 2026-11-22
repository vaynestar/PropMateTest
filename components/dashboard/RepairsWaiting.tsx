import Link from "next/link";
import { ticketRef } from "@/lib/ticket-states";

/**
 * Repairs waiting, beside the chart (DEV-271).
 *
 * The queue used to sit at the very bottom of the dashboard under "Work in
 * progress", below two charts and a table — the last thing on the page, when
 * it is one of the two things the user asked to keep above the fold.
 *
 * It is a narrow column here, so it is a list rather than the filterable
 * table: oldest first, the age, and the one fact that decides whether this
 * list needs anybody — how many have nobody on them.
 */
export default function RepairsWaiting({
  tickets,
  unowned,
  total,
}: {
  tickets: {
    ticket_id: string;
    ticket_no?: string | null;
    title: string;
    priority: string;
    created_at: Date | string;
    ticket_category: string;
  }[];
  unowned: number;
  total: number;
}) {
  const rail: Record<string, string> = {
    Urgent: "bg-rose-400",
    High: "bg-amber-400",
    Medium: "bg-primary",
    Low: "bg-slate-500",
  };

  const days = (d: Date | string) =>
    Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));

  const oldest = [...tickets]
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    .slice(0, 5);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
      <div className="flex items-baseline justify-between gap-3 border-b border-outline-variant/40 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-on-surface">Repairs waiting</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">Oldest first</p>
        </div>
        <Link href="/admin/maintenance" className="text-xs font-semibold text-primary hover:underline">
          All {total}
        </Link>
      </div>

      <div className="flex-1">
        {oldest.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-on-surface-variant">
            Nothing is waiting. Every repair on this property is closed.
          </p>
        ) : (
          oldest.map((t, i) => {
            const age = days(t.created_at);
            return (
              <Link
                key={t.ticket_id}
                href={`/admin/maintenance/${t.ticket_id}`}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-high/50 ${
                  i ? "border-t border-outline-variant/30" : ""
                }`}
              >
                <span className={`h-8 w-[3px] shrink-0 rounded-full ${rail[t.priority] ?? rail.Low}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-on-surface">{t.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">
                    {ticketRef(t)} · {t.ticket_category}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold tabular-nums ${
                    age > 30
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      : age > 7
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-outline-variant bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {age}d
                </span>
              </Link>
            );
          })
        )}
      </div>

      {unowned > 0 && (
        <div className="border-t border-outline-variant/40 px-4 py-2.5">
          <p className="text-[11px] text-on-surface-variant">
            {unowned === 1 ? "One has" : `${unowned} have`} nobody on them.{" "}
            <Link href="/admin/maintenance" className="font-semibold text-primary hover:underline">
              Assign them
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
