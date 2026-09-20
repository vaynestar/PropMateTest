/**
 * A labelled horizontal bar per row - the cheapest honest chart there is
 * (DEV-194). Used for ticket status and ticket age, where a pie would hide the
 * one number that matters: how many.
 */
export default function BarList({
  rows,
  colourOf,
  emptyText = "Nothing to show.",
  suffix,
}: {
  rows: { label: string; count: number }[];
  /** CSS colour per row; falls back to the primary tint. */
  colourOf?: (label: string, index: number) => string;
  emptyText?: string;
  /** e.g. "tickets" - appears after the count on the widest row only. */
  suffix?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (!total) return <p className="py-6 text-center text-xs text-on-surface-variant">{emptyText}</p>;

  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="flex items-center gap-3 text-xs">
          <span className="w-24 shrink-0 truncate text-on-surface-variant sm:w-28">{r.label}</span>
          <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
            <span
              className="block h-full rounded-full transition-all"
              style={{
                width: `${Math.max(r.count ? 4 : 0, (r.count / max) * 100)}%`,
                background: colourOf?.(r.label, i) ?? "#8b5cf6",
              }}
            />
          </span>
          <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-on-surface">
            {r.count}
            {suffix && r.count === max ? <span className="ml-1 font-normal text-on-surface-variant">{suffix}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
