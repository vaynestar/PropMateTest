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

export const CARD = "rounded-xl border border-outline-variant/50 bg-surface-container";
/**
 * Kept as an alias so the eleven call sites keep compiling. There is no
 * gradient any more — see the note on StatCard.
 * @deprecated use CARD.
 */
export const GRADIENT_CARD = CARD;
export const LABEL = "text-[11px] font-medium text-on-surface-variant";

export type Tone = "neutral" | "primary" | "positive" | "warning" | "critical";

/**
 * Tone marks an exception, and it marks it in exactly two places: the card's
 * own border and the value's colour. No tinted icon chip, no corner gradient,
 * no blurred bloom.
 *
 * Those three were the reason the portal read as generated. Every tile had an
 * icon in a coloured rounded box, a gradient and a glow, so a tile that
 * mattered looked identical to one that did not — the page had five accents
 * and therefore none. (User, 2026-11-07: "still crowded and very ai like".)
 *
 * The 2px rule down the left edge went in DEV-252. It was the surviving piece
 * of the same habit: a coloured stripe glued to a card edge, carrying meaning
 * at 2px that the border and the number already carry at full size. DESIGN.md
 * bans it by name. Tone is now one thing — the whole border changes — so a
 * tile that matters is legible from across the room and a neutral one is
 * genuinely quiet.
 */
const TONE: Record<Tone, { border: string; value: string; ring: string }> = {
  neutral: {
    border: "border-outline-variant/50",
    value: "text-white",
    ring: "hover:border-outline",
  },
  primary: {
    border: "border-primary/45",
    value: "text-white",
    ring: "hover:border-primary/70",
  },
  positive: {
    border: "border-emerald-500/40",
    value: "text-white",
    ring: "hover:border-emerald-500/60",
  },
  warning: {
    border: "border-amber-500/45",
    value: "text-amber-200",
    ring: "hover:border-amber-500/65",
  },
  critical: {
    border: "border-rose-500/45",
    value: "text-rose-200",
    ring: "hover:border-rose-500/65",
  },
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
    /*
     * The actions used to be `sm:shrink-0`, so from 640px up they kept their
     * full width whatever that was and the title block absorbed the whole
     * shortfall. On the dashboard, whose actions are five quick-action
     * buttons, that left about 40px for the word "Dashboard" at tablet width:
     * the heading rendered one letter per line underneath the buttons, which
     * overlapped it. Fine at 1440, fine on a phone where the header stacks,
     * broken across the middle (DEV-283).
     *
     * Now the title claims the remaining space, the actions wrap rather than
     * push, and the two only sit side by side from `lg` — below that the
     * header stacks, which is what it already did on a phone and reads
     * perfectly well. Side by side from 640px was the optimistic assumption.
     */
    <header className="flex flex-col gap-3 border-b border-outline-variant/40 pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">{subtitle}</p>}
        {children}
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
      )}
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
  /** @deprecated no longer rendered; kept so existing call sites compile. */
  icon?: string;
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
      <span className={`${LABEL} block truncate`}>{label}</span>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        <span
          className={`min-w-0 break-words text-[22px] font-semibold leading-none tracking-tight tabular-nums sm:text-[26px] ${t.value}`}
        >
          {value}
        </span>
        {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
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

  // `icon` is still accepted by the prop type — twenty-eight call sites pass
  // one — but nothing renders it any more.
  void icon;
  const shell = `rounded-xl border bg-surface-container ${t.border} overflow-hidden p-4 transition-colors ${
    href ? `${t.ring} pressable` : ""
  }`;
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
  /** @deprecated no longer rendered; a section heading does not need a glyph. */
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  /** false when the child is a table that should meet the card edges. */
  padded?: boolean;
}) {
  void icon;
  return (
    <section className={`${CARD} overflow-hidden`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
            {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
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
  // Flat fill, not the 135° purple gradient `.btn-primary` carried since the
  // first build. A gradient on the one control the eye should land on is the
  // same mistake as a gradient on every card: decoration where emphasis was
  // needed. This also finally matches AGENTS.md Rule 4.
  primary:
    "pressable inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50",
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

/* ------------------------------------------------------------------------- *
 * The four states a screen can be in (DEV-252)
 *
 * Until now there was one of these — EmptyState — and the other three were
 * not written at all. So a list with no rows, a list that failed to load and
 * a list belonging to another property all rendered the same thing: a card
 * with a header row and nothing under it. The reader could not tell which,
 * and no state offered a next move.
 *
 * Four components, four distinguishable looks, each carrying the one action a
 * reader would want. The rule: never a bare spinner, never "Something went
 * wrong", never an empty table.
 * ------------------------------------------------------------------------- */

/** A frame shared by the three "nothing to show" states, so they match. */
function StateShell({
  icon,
  iconClass,
  title,
  titleClass,
  children,
}: {
  icon: string;
  iconClass: string;
  title: string;
  titleClass: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
      >
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </span>
      <p className={`text-[15px] font-semibold ${titleClass}`}>{title}</p>
      {children}
    </div>
  );
}

/**
 * Nothing is wrong — there is simply nothing yet. So it names what is missing
 * and offers the thing that would create the first one.
 */
export function EmptyState({
  icon = "inbox",
  title,
  hint,
  action,
  secondary,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** A quieter alternative, e.g. "Or write a one-off invoice". */
  secondary?: ReactNode;
}) {
  return (
    <StateShell
      icon={icon}
      iconClass="border border-dashed border-outline-variant/70 text-on-surface-variant/60"
      title={title}
      titleClass="text-on-surface"
    >
      {hint && <p className="max-w-md text-[13px] leading-relaxed text-on-surface-variant">{hint}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
      {secondary && <div className="text-xs text-on-surface-variant">{secondary}</div>}
    </StateShell>
  );
}

/**
 * It broke. Say what failed, say whether anything was changed, give the reader
 * a way out, and carry the one string a developer needs to find it in a log.
 */
export function ErrorState({
  title,
  detail,
  action,
  reference,
}: {
  title: string;
  /** What failed and whether anything was written. */
  detail?: string;
  action?: ReactNode;
  /** A short code the reader can quote, e.g. "21 Nov 09:41 · ref 4f21c8". */
  reference?: string;
}) {
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/[0.05]">
      <StateShell
        icon="warning"
        iconClass="border border-rose-500/35 bg-rose-500/10 text-rose-400"
        title={title}
        titleClass="text-rose-100"
      >
        {detail && <p className="max-w-md text-[13px] leading-relaxed text-rose-200/90">{detail}</p>}
        {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
        {reference && (
          <p className="mt-1 rounded-lg border border-outline-variant/50 bg-black/30 px-2.5 py-1.5 text-[11px] text-on-surface-variant">
            {reference}
          </p>
        )}
      </StateShell>
    </div>
  );
}

/**
 * Not empty and not broken: the reader is in the wrong property, or their
 * account does not reach this. Both are one click from fixed, so say which.
 */
export function DeniedState({
  title,
  detail,
  action,
  footnote,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  footnote?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.05]">
      <StateShell
        icon="lock"
        iconClass="border border-amber-500/35 bg-amber-500/10 text-amber-400"
        title={title}
        titleClass="text-amber-100"
      >
        {detail && <p className="max-w-md text-[13px] leading-relaxed text-amber-100/80">{detail}</p>}
        {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
        {footnote && <p className="max-w-md text-xs text-on-surface-variant">{footnote}</p>}
      </StateShell>
    </div>
  );
}

/**
 * Loading is the shape of what is coming, at the height it will be, so the
 * page does not jump when the figures land. Not a spinner over a void.
 */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-outline-variant/30">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <span
              key={c}
              className={`h-3 rounded bg-surface-container-high ${c === 0 ? "w-28" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TileSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${CARD} h-[88px] p-4`}>
          <span className="block h-2.5 w-20 rounded bg-surface-container-high" />
          <span className="mt-3 block h-6 w-24 rounded bg-surface-container-high" />
        </div>
      ))}
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
