"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminNav } from "@/lib/admin-nav";

/**
 * One box for the whole property (DEV-277, batch-4 `CommandSearch` artboard).
 *
 * Finding unit A-12-07 meant Properties, then Units, then a filter, then
 * reading a page of rows. Finding the invoice behind a phone call meant
 * knowing which of eleven screens it lives on before you could start.
 *
 * Ctrl-K (⌘K on a Mac) from anywhere in the admin panel. Typing nothing
 * lists the destinations, so the palette is also the fastest way to reach a
 * screen; typing two characters searches the property's units, residents,
 * invoices, repairs, visitors, facilities and notices at once.
 *
 * **Every row navigates. Nothing here acts.** The artboard offered "send a
 * reminder for all three invoices" from the palette — PropMate has no mail
 * transport, so that button would have been a lie. A palette is a fast way
 * to *arrive* somewhere; the deciding still happens on the screen that owns
 * it, where the confirmations and the audit trail are.
 */

type Hit = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  href: string;
  tag?: string;
  tone?: "bad" | "warn" | "good";
};
type Section = { heading: string; hits: Hit[] };

const TAG_TONE: Record<string, string> = {
  bad: "border-rose-500/35 bg-rose-500/10 text-rose-300",
  warn: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  good: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
};

/*
 * Mounted ONCE, in the desktop strip of the admin top bar. Two instances
 * would each register the Ctrl-K listener and each render a dialog, so the
 * chord would open two stacked palettes. The dialog therefore lives inside a
 * container that is `hidden` below md — which is the right trade: the palette
 * is a keyboard affordance, and a phone has the bottom nav and each screen's
 * own search field.
 */
export default function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [isMac, setIsMac] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  /** Guards against a slow early request landing after a later one. */
  const seq = useRef(0);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  /** The destinations, shown before anything is typed and filtered as you type. */
  const navSection = useMemo<Section>(() => {
    // The sidebar's own tree, flattened. A child inherits its parent's icon,
    // and a parent whose first child is itself (Properties → All Properties)
    // is not listed twice.
    const hits: Hit[] = [];
    const seen = new Set<string>();
    for (const item of adminNav) {
      for (const node of [item, ...(item.children ?? [])]) {
        if (seen.has(node.href)) continue;
        seen.add(node.href);
        hits.push({
          id: node.href,
          icon: item.icon,
          title: node.label,
          sub: item.children && node !== item ? item.label : node.href,
          href: node.href,
        });
      }
    }
    const needle = q.trim().toLowerCase();
    return {
      heading: "Go to",
      hits: needle
        ? hits.filter((h) => h.title.toLowerCase().includes(needle)).slice(0, 4)
        : hits,
    };
  }, [q]);

  const shown = useMemo<Section[]>(() => {
    const out = [...sections];
    if (navSection.hits.length) out.push(navSection);
    return out;
  }, [sections, navSection]);

  const flat = useMemo(() => shown.flatMap((s) => s.hits), [shown]);

  // Ctrl-K / Cmd-K from anywhere, and "/" when nothing is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setCursor(0);
      // The input mounts with the dialog, so focus waits a frame.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQ("");
      setSections([]);
    }
  }, [open]);

  // Debounced, because this hits the database across seven tables.
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(needle)}`);
        const data = await res.json();
        // A stale response must never overwrite a newer one.
        if (mine !== seq.current) return;
        setSections(Array.isArray(data?.sections) ? data.sections : []);
      } catch {
        if (mine === seq.current) setSections([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setCursor(0), [shown.length, q]);

  const go = useCallback(
    (hit: Hit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!flat.length) return;
      setCursor((c) => {
        const next = e.key === "ArrowDown" ? c + 1 : c - 1;
        return (next + flat.length) % flat.length;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[cursor];
      if (hit) go(hit);
    }
  };

  // Keep the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const chord = isMac ? "⌘K" : "Ctrl K";
  let idx = -1;

  return (
    <>
      {/*
        The trigger. A keyboard shortcut nobody is told about is a shortcut
        nobody uses, so the chord is printed on the control itself.
      */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex h-10 min-w-0 max-w-[320px] flex-1 items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 text-left text-sm text-on-surface-variant transition-colors hover:border-primary/40 hover:text-on-surface"
      >
        <span className="material-symbols-outlined shrink-0 text-[18px]">search</span>
        <span className="min-w-0 flex-1 truncate">Search this property…</span>
        <kbd className="shrink-0 rounded border border-outline-variant/60 bg-surface-container px-1.5 py-0.5 font-sans text-[10.5px] font-bold text-on-surface-variant">
          {chord}
        </kbd>
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-[#060a14]/80 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search this property"
            className="flex max-h-[72vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
            onKeyDown={onKeyDown}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/50 px-4 py-3">
              <span className="material-symbols-outlined shrink-0 text-[19px] text-primary">
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="A unit, a resident, an invoice number, a repair…"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant/60"
              />
              {loading && (
                <span className="material-symbols-outlined animate-spin-slow shrink-0 text-[17px] text-on-surface-variant">
                  progress_activity
                </span>
              )}
              <kbd className="shrink-0 rounded-md border border-outline-variant/60 bg-surface-container-high px-1.5 py-0.5 font-sans text-[10.5px] font-bold text-on-surface-variant">
                Esc
              </kbd>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-2">
              {q.trim().length >= 2 && !loading && flat.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-on-surface-variant">
                  Nothing in this property matches{" "}
                  <span className="font-semibold text-on-surface">“{q.trim()}”</span>.
                </p>
              )}

              {shown.map((section) => (
                <div key={section.heading}>
                  <p className="px-4 pb-1.5 pt-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant/70">
                    {section.heading}
                  </p>
                  {section.hits.map((hit) => {
                    idx += 1;
                    const here = idx;
                    const on = here === cursor;
                    return (
                      <button
                        key={`${section.heading}-${hit.id}`}
                        type="button"
                        data-idx={here}
                        onMouseEnter={() => setCursor(here)}
                        onClick={() => go(hit)}
                        className={`flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left transition-colors ${
                          on
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-surface-container-high/60"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined shrink-0 text-[19px] ${
                            on ? "text-primary" : "text-on-surface-variant"
                          }`}
                        >
                          {hit.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-on-surface">
                            {hit.title}
                          </span>
                          <span className="mt-px block truncate text-[11.5px] text-on-surface-variant">
                            {hit.sub}
                          </span>
                        </span>
                        {hit.tag && (
                          <span
                            className={`shrink-0 whitespace-nowrap rounded-lg border px-2 py-1 text-[10.5px] font-bold ${
                              TAG_TONE[hit.tone ?? ""] ??
                              "border-outline-variant/60 bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            {hit.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-4 border-t border-outline-variant/50 bg-surface-container px-4 py-2.5 text-[11px] text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <Key>↑ ↓</Key> move
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Key>Enter</Key> open
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Key>{chord}</Key> from anywhere
              </span>
              <span className="ml-auto text-on-surface-variant/60">
                This property only
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-outline-variant/60 bg-surface-container-high px-1.5 py-0.5 font-sans text-[10px] font-bold text-on-surface">
      {children}
    </kbd>
  );
}
