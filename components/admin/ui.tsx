import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The admin design kit (DEV-192; user: the admin portal is "plain, congested,
 * and not designed well for all modules").
 *
 * Every admin module used to invent its own page header, its own stat card and
 * its own filter row, so eleven screens never looked like one product. These
 * are the shared pieces. Rules, so they stay consistent:
 *
 *  - one H1 per page, in `PageHeader`, with a one-line purpose beneath it;
 *  - the primary action sits on the right of the header, never mid-page;
 *  - stat cards are neutral by default - colour marks an exception
 *    (money overdue, tickets breaching), not decoration;
 *  - numbers are `tabular-nums`, never `font-mono`;
 *  - one card surface: rounded-2xl, border-outline-variant/60, bg-surface-container;
 *  - sections are separated by `space-y-5`, nothing tighter.
 */

export const CARD = "rounded-2xl border border-outline-variant/60 bg-surface-container";
export const LABEL = "text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant";

export type Tone = "neutral" | "primary" | "positive" | "warning" | "critical";

const TONE: Record<Tone, { icon: string; value: string; ring: string }> = {
  neutral: { icon: "text-on-surface-variant bg-surface-container-highest", value: "text-on-surface", ring: "hover:border-outline" },
  primary: { icon: "text-primary bg-primary/15", value: "text-on-surface", ring: "hover:border-primary/50" },
  positive: { icon: "text-emerald-300 bg-emerald-500/15", value: "text-on-surface", ring: "hover:border-emerald-500/40" },
  warning: { icon: "text-amber-300 bg-amber-500/15", value: "text-amber-200", ring: "hover:border-amber-500/40" },
  critical: { icon: "text-rose-300 bg-rose-500/15", value: "text-rose-200", ring: "hover:border-rose-500/40" },
};

/** The top of every admin page. Title, why the page exists, actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Secondary controls that belong with the title (tabs, a manage link). */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-outline-variant/40 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </header>
  );
}

/** Equal-width stat cards. Four across on a wide screen, two on a phone. */
export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const wide = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={`grid grid-cols-2 gap-3 ${wide}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
  progress,
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: string;
  tone?: Tone;
  href?: string;
  /** 0-100; draws a thin bar under the value. */
  progress?: number;
  /** A small label/value pair on its own line, e.g. "Overdue  RM 24,530". */
  footer?: { label: string; value: ReactNode; tone?: Tone };
}) {
  const t = TONE[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={LABEL}>{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tabular-nums ${t.value}`}>{value}</span>
        {hint && <span className="truncate text-xs text-on-surface-variant">{hint}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className={`h-full rounded-full ${tone === "critical" ? "bg-rose-400" : tone === "warning" ? "bg-amber-400" : "bg-primary"}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {footer && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-2.5 text-[11px] sm:text-xs">
          <span className="min-w-0 truncate text-on-surface-variant">{footer.label}</span>
          <span
            className={`shrink-0 whitespace-nowrap font-semibold tabular-nums ${TONE[footer.tone ?? "neutral"].value}`}
          >
            {footer.value}
          </span>
        </div>
      )}
    </>
  );

  const shell = `${CARD} p-4 transition-colors ${href ? `${t.ring} pressable` : ""}`;
  return href ? <Link href={href} className={`block ${shell}`}>{body}</Link> : <div className={shell}>{body}</div>;
}

/** A titled block of content. Replaces eleven hand-built card headers. */
export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  /** false when the child is a table that should meet the card edges. */
  padded?: boolean;
}) {
  return (
    <section className={`${CARD} overflow-hidden`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">{title}</h2>
              {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={padded ? "p-4 sm:p-5" : ""}>{children}</div>
    </section>
  );
}

/** Search + filters + (optionally) a view switch, identical on every module. */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`${CARD} flex flex-col gap-3 p-3 lg:flex-row lg:items-center`}>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export const FIELD =
  "h-10 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary";

export function SearchField({
  name = "q",
  placeholder = "Search…",
  defaultValue,
  onChange,
  value,
}: {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  value?: string;
}) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
        search
      </span>
      <input
        type="search"
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`${FIELD} w-full pl-10 placeholder:text-on-surface-variant/60`}
      />
    </div>
  );
}

/** Buttons. Exactly three kinds, so every module's actions look the same. */
export const BTN = {
  primary:
    "btn-primary pressable inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50",
  secondary:
    "pressable inline-flex h-10 items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest disabled:opacity-50",
  ghost:
    "pressable inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-white",
};

/** Table styling used by every admin list. */
export const TABLE = {
  wrap: "w-full overflow-x-auto overflow-y-hidden",
  table: "w-full min-w-[640px] border-collapse text-sm",
  th: "sticky top-0 z-10 bg-surface-container-high px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant",
  thNum: "sticky top-0 z-10 bg-surface-container-high px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant",
  tr: "border-t border-outline-variant/40 transition-colors hover:bg-surface-container-high/50",
  td: "px-4 py-3 align-middle text-on-surface",
  tdNum: "px-4 py-3 text-right align-middle tabular-nums text-on-surface",
  tdMuted: "px-4 py-3 align-middle text-on-surface-variant",
};

export function EmptyState({
  icon = "inbox",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span className="material-symbols-outlined text-[28px] text-on-surface-variant/40">{icon}</span>
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      {hint && <p className="max-w-sm text-xs text-on-surface-variant">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Money, always the same shape: RM 1,234.50 with aligned digits. */
export function Money({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`tabular-nums ${className}`}>
      RM {value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
