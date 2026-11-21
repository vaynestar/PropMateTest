"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BTN, CARD, EmptyState, Money, TABLE } from "@/components/admin/ui";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { sendArrearsReminders } from "@/app/admin/billing/arrears/actions";
import { STEPS, type ArrearsStep } from "@/lib/arrears-steps";

/** The shape `getArrears` returns, with dates already serialised for the client. */
export type ArrearsRowView = {
  leaseId: string;
  unitNumber: string;
  tenantId: string | null;
  tenantName: string;
  contact: string;
  owed: number;
  invoiceCount: number;
  oldestDaysLate: number;
  oldestInvoiceNo: string;
  step: ArrearsStep;
  history: { at: string; what: string }[];
};

const STEP_TONE: Record<ArrearsStep, { dot: string; text: string; card: string; on: string }> = {
  late: {
    dot: "bg-slate-300",
    text: "text-on-surface-variant",
    card: "border-outline-variant/60",
    on: "border-primary bg-primary/10",
  },
  first: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    card: "border-amber-500/40",
    on: "border-primary bg-primary/10",
  },
  second: {
    dot: "bg-orange-400",
    text: "text-orange-300",
    card: "border-orange-500/40",
    on: "border-primary bg-primary/10",
  },
  final: {
    dot: "bg-rose-400",
    text: "text-rose-300",
    card: "border-rose-500/50",
    on: "border-primary bg-primary/10",
  },
};

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export default function ArrearsClient({ rows }: { rows: ArrearsRowView[] }) {
  const router = useRouter();
  const [step, setStep] = useState<ArrearsStep | "all">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<null | { kind: "reminder" | "final"; ids: string[] }>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [pending, startTransition] = useTransition();

  const byStep = useMemo(() => {
    const m = new Map<ArrearsStep, ArrearsRowView[]>();
    for (const s of STEPS) m.set(s.key, []);
    for (const r of rows) m.get(r.step)!.push(r);
    return m;
  }, [rows]);

  const shown = step === "all" ? rows : byStep.get(step)!;
  const pickedRows = shown.filter((r) => picked.has(r.leaseId));
  const pickedOwed = pickedRows.reduce((sum, r) => sum + r.owed, 0);

  const send = (ids: string[], kind: "reminder" | "final") =>
    startTransition(async () => {
      const res = await sendArrearsReminders(ids, kind);
      setConfirming(null);
      if (res.success) {
        setPicked(new Set());
        setToast({
          message: res.message ?? "Sent",
          detail: "It is in their app now. There is no recall — taking it back does not unsee it.",
          tone: "success",
        });
        router.refresh();
      } else {
        setToast({ message: res.error ?? "Nothing was sent", tone: "error" });
      }
    });

  if (rows.length === 0) {
    return (
      <div className={CARD}>
        <EmptyState
          icon="savings"
          title="Nothing is overdue"
          hint="Every invoice issued on this property has either been paid or is not due yet."
          action={
            <Link href="/admin/invoices" className={BTN.secondary}>
              Open invoices
            </Link>
          }
        />
      </div>
    );
  }

  const dialog = confirming
    ? (() => {
        const n = confirming.ids.length;
        const owed = rows.filter((r) => confirming.ids.includes(r.leaseId)).reduce((s, r) => s + r.owed, 0);
        const asMoney = `RM ${owed.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
        const final = confirming.kind === "final";
        return {
          title: final
            ? `Send a final notice to ${n} resident${n === 1 ? "" : "s"}?`
            : `Send a reminder to ${n} resident${n === 1 ? "" : "s"}?`,
          body: (
            <>
              <p>
                {asMoney} in total. Each resident gets one message about their own balance, not one per
                invoice.
              </p>
              {final && (
                <p>
                  A final notice names the by-laws. Send it only where the office is genuinely prepared to
                  follow through.
                </p>
              )}
              <p className="text-on-surface-variant">
                It appears in the resident app. No email is sent — PropMate has no mail transport.
              </p>
            </>
          ),
          confirmLabel: final ? `Send the final notice` : `Send to ${n}`,
          cancelLabel: "Not yet",
          irreversible: "It is recorded against the tenancy and cannot be unsent.",
        };
      })()
    : null;

  return (
    <div className="flex flex-col gap-5">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* The ladder. This is the structure a strata office actually works to,
          and it was nowhere in the build — the old table was one flat list of
          overdue invoices with no sense of how far each had been pushed. */}
      <section>
        <h2 className="text-sm font-semibold text-white">Where each unit sits</h2>
        <p className="mt-1 text-[13px] text-on-surface-variant">
          The office escalates in steps. Pick one to work through it.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STEPS.map((s) => {
            const list = byStep.get(s.key)!;
            const tone = STEP_TONE[s.key];
            const on = step === s.key;
            const owed = list.reduce((sum, r) => sum + r.owed, 0);
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setStep(on ? "all" : s.key);
                  setPicked(new Set());
                }}
                className={`pressable rounded-xl border bg-surface-container p-4 text-left transition-colors ${
                  on ? tone.on : `${tone.card} hover:bg-surface-container-high`
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${on ? "text-primary" : tone.text}`}>
                    {s.label}
                  </span>
                </span>
                <span className="mt-2.5 block text-2xl font-bold tabular-nums leading-none text-white">
                  {list.length}
                </span>
                <span className="mt-1.5 block text-xs text-on-surface-variant">
                  {list.length === 0 ? s.blurb : <Money value={owed} />}
                </span>
                <span className="mt-0.5 block text-[11px] text-on-surface-variant/70">
                  {s.to === null ? `over ${s.from - 1} days` : `${s.from}–${s.to} days`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {pickedRows.length > 0 && (
        <div className="animate-fade-in flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/[0.08] px-4 py-3">
          <span className="text-[13px] font-bold tabular-nums text-primary">
            {pickedRows.length} selected · <Money value={pickedOwed} />
          </span>
          <span className="hidden h-5 w-px bg-outline-variant sm:block" />
          <button
            type="button"
            onClick={() => setConfirming({ kind: "reminder", ids: pickedRows.map((r) => r.leaseId) })}
            className={BTN.primary}
          >
            Send a reminder
          </button>
          <button
            type="button"
            onClick={() => setConfirming({ kind: "final", ids: pickedRows.map((r) => r.leaseId) })}
            className={BTN.secondary}
          >
            Send a final notice
          </button>
          <button type="button" onClick={() => setPicked(new Set())} className={`${BTN.ghost} ml-auto`}>
            Clear
          </button>
        </div>
      )}

      {/* ---------- Desktop ---------- */}
      <section className={`${CARD} hidden overflow-hidden xl:block`}>
        <div className={TABLE.wrap}>
          <table className={TABLE.table}>
            <caption className="sr-only">Tenancies in arrears, largest balance first</caption>
            <thead>
              <tr>
                <th scope="col" className={`${TABLE.th} w-12 pr-0`}>
                  <input
                    type="checkbox"
                    aria-label="Select every tenancy shown"
                    checked={shown.length > 0 && pickedRows.length === shown.length}
                    onChange={(e) => setPicked(e.target.checked ? new Set(shown.map((r) => r.leaseId)) : new Set())}
                    className="h-4 w-4 accent-primary"
                  />
                </th>
                <th scope="col" className={TABLE.th}>
                  Unit &amp; resident
                </th>
                <th scope="col" className={TABLE.thNum}>
                  Owed
                </th>
                <th scope="col" className={TABLE.thNum}>
                  Oldest
                </th>
                <th scope="col" className={TABLE.th}>
                  What we have already done
                </th>
                <th scope="col" className={TABLE.thNum}>
                  Next step
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const tone = STEP_TONE[r.step];
                const final = r.step === "final" || r.step === "second";
                return (
                  <tr key={r.leaseId} className={TABLE.tr}>
                    <td className="pl-4 pt-4 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.unitNumber}`}
                        checked={picked.has(r.leaseId)}
                        onChange={() =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            next.has(r.leaseId) ? next.delete(r.leaseId) : next.add(r.leaseId);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className={`${TABLE.td} align-top`}>
                      <Link
                        href={`/admin/invoices?lease=${r.leaseId}`}
                        className="font-semibold text-white decoration-primary/40 underline-offset-4 hover:underline"
                      >
                        {r.unitNumber}
                      </Link>
                      <span className="mt-0.5 block text-[13px] text-on-surface">{r.tenantName}</span>
                      <span className="mt-0.5 block text-[11.5px] text-on-surface-variant">{r.contact}</span>
                    </td>
                    <td className={`${TABLE.tdNum} align-top`}>
                      <Money value={r.owed} className="text-[15px] font-bold text-rose-200" />
                      <span className="mt-0.5 block text-[11.5px] font-normal text-on-surface-variant">
                        {r.invoiceCount} invoice{r.invoiceCount === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className={`${TABLE.tdNum} align-top`}>
                      <span className={`font-semibold ${tone.text}`}>{r.oldestDaysLate} days</span>
                      <span className="mt-0.5 block font-mono text-[11px] font-normal text-on-surface-variant">
                        {r.oldestInvoiceNo}
                      </span>
                    </td>
                    {/* The column the screen exists for. */}
                    <td className={`${TABLE.td} align-top`}>
                      {r.history.length === 0 ? (
                        <span className="text-[12.5px] italic text-on-surface-variant">
                          Nothing. This resident has never been told.
                        </span>
                      ) : (
                        <ol className="flex list-none flex-col gap-1.5 p-0 text-[12.5px] text-on-surface">
                          {r.history.map((h, i) => (
                            <li key={i} className="flex items-baseline gap-2">
                              <span
                                className="h-[5px] w-[5px] shrink-0 rounded-full bg-primary/70"
                                aria-hidden="true"
                              />
                              <span>
                                {h.what}
                                <span className="text-on-surface-variant"> · {when(h.at)}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                    <td className={`${TABLE.td} align-top text-right`}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setConfirming({ kind: final ? "final" : "reminder", ids: [r.leaseId] })
                        }
                        className={`pressable inline-flex h-10 items-center whitespace-nowrap rounded-xl px-3.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                          final
                            ? "bg-primary text-on-primary hover:bg-primary/90"
                            : "border border-outline-variant/60 bg-surface-container-high font-semibold text-on-surface hover:bg-surface-container-highest"
                        }`}
                      >
                        {final ? "Send a final notice" : "Send a reminder"}
                      </button>
                      <span className="mt-1.5 block text-[11.5px] text-on-surface-variant">
                        {r.history.length === 0
                          ? "Never been chased"
                          : `Last chased ${when(r.history[0].at)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Phone and tablet ---------- */}
      <div className="flex flex-col gap-2.5 xl:hidden">
        {shown.map((r) => {
          const tone = STEP_TONE[r.step];
          const final = r.step === "final" || r.step === "second";
          return (
            <article key={r.leaseId} className={`rounded-2xl border bg-surface-container p-4 ${tone.card}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${r.unitNumber}`}
                  checked={picked.has(r.leaseId)}
                  onChange={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      next.has(r.leaseId) ? next.delete(r.leaseId) : next.add(r.leaseId);
                      return next;
                    })
                  }
                  className="mt-1 h-5 w-5 shrink-0 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-white">{r.unitNumber}</p>
                  <p className="text-[13px] text-on-surface">{r.tenantName}</p>
                  <p className="text-[11.5px] text-on-surface-variant">{r.contact}</p>
                </div>
                <span className={`shrink-0 text-right text-xs font-semibold ${tone.text}`}>
                  {r.oldestDaysLate} days
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                <Money value={r.owed} className="text-xl font-bold tracking-tight text-rose-200" />
                <span className="text-xs text-on-surface-variant">
                  {r.invoiceCount} invoice{r.invoiceCount === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-2.5 text-[12.5px] text-on-surface-variant">
                {r.history.length === 0 ? (
                  <em>Nothing. This resident has never been told.</em>
                ) : (
                  <>
                    {r.history[0].what} · {when(r.history[0].at)}
                    {r.history.length > 1 && ` (and ${r.history.length - 1} before that)`}
                  </>
                )}
              </p>

              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming({ kind: final ? "final" : "reminder", ids: [r.leaseId] })}
                className={`pressable mt-3.5 inline-flex h-11 w-full items-center justify-center rounded-xl px-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                  final
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant/60 bg-surface-container-high font-semibold text-on-surface"
                }`}
              >
                {final ? "Send a final notice" : "Send a reminder"}
              </button>
            </article>
          );
        })}
      </div>

      {dialog && confirming && (
        <ConfirmDialog
          open
          tone="primary"
          title={dialog.title}
          body={dialog.body}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          irreversible={dialog.irreversible}
          pending={pending}
          onConfirm={() => send(confirming.ids, confirming.kind)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
