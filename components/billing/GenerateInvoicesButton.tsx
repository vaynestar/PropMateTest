"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateInvoicesAction, getInvoiceRunPlanAction } from "@/app/admin/invoices/actions";
import { BTN, Money } from "@/components/admin/ui";
import { backdropProps, useDialogDismiss } from "@/components/ui/useDialogDismiss";

/**
 * Raise invoices — the guided run (rebuilt DEV-259, to the batch-1
 * `RaiseStep1` / `RaiseStep2` / `RaiseDone` artboards). This closes the
 * long-standing roadmap item "Guided Single Invoice Stepper Wizard".
 *
 * What the old dialog did. One screen: a month picker and a scrolling list of
 * every eligible lease with a tick box, all pre-ticked. You pressed Generate
 * and found out afterwards what had happened. The two questions an admin
 * actually has — *how much is about to be billed* and *who is being left
 * out* — were both answered after the fact, and the second one barely: the
 * run reported eight invoices created and said nothing about the four leases
 * it passed over.
 *
 * Three steps now.
 *   1. **Scope** — which month, and everybody or a chosen few.
 *   2. **Check** — one sentence saying how many invoices, totalling what,
 *      dated when and due when; the table of what will be created; and,
 *      under its own amber heading, **what will be skipped and why**, each
 *      with a link to the screen that fixes it.
 *   3. **Raise** — the outcome, with the same detail, and a way through to
 *      the invoices just created.
 */

type Plan = Awaited<ReturnType<typeof getInvoiceRunPlanAction>>;

const STEP_TITLES = ["Scope", "Check", "Raise"] as const;

function Steps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center border-b border-outline-variant/40 bg-surface-container-lowest px-5 py-3.5">
      {STEP_TITLES.map((title, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        return (
          <span key={title} className={`flex items-center gap-2.5 ${i < 2 ? "min-w-0 flex-1" : ""}`}>
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                state === "now"
                  ? "bg-primary text-on-primary"
                  : state === "done"
                  ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border border-outline-variant bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {state === "done" ? (
                <span className="material-symbols-outlined text-[14px] leading-none">check</span>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`whitespace-nowrap text-xs ${
                state === "now" ? "font-bold text-primary" : "font-medium text-on-surface-variant"
              } ${i < 2 ? "flex-1 border-b border-dashed border-outline-variant pr-3" : ""}`}
            >
              {title}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function GenerateInvoicesButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [scope, setScope] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ generated: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [targetMonth, setTargetMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const close = useCallback(() => {
    setOpen(false);
    setStep(0);
    setResult(null);
    setError(null);
    setScope("all");
  }, []);
  useDialogDismiss(open, close);

  // UTC midnight: a month built at local midnight arrives at the server as the
  // previous month for any browser ahead of UTC (DEV-224).
  const targetDateIso = () => {
    const [y, m] = targetMonth.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toISOString();
  };

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getInvoiceRunPlanAction(targetDateIso());
      setPlan(p);
      setPicked(new Set(p.billable.map((b) => b.leaseId)));
    } catch {
      setError("Could not work out what this run would do. Try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonth]);

  useEffect(() => {
    if (open) loadPlan();
  }, [open, loadPlan]);

  const monthLabel = (() => {
    const [y, m] = targetMonth.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  })();

  const chosen = plan ? plan.billable.filter((b) => scope === "all" || picked.has(b.leaseId)) : [];
  const chosenTotal = chosen.reduce((sum, r) => sum + r.amount, 0);

  const dueLabel = (() => {
    if (!plan) return "";
    const [y, m] = targetMonth.split("-").map(Number);
    const issue = new Date(Date.UTC(y, m - 1, plan.dates.invoiceCycleDay));
    const due = new Date(issue);
    due.setUTCDate(due.getUTCDate() + plan.dates.gracePeriodDays);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return `${fmt(issue)} and due ${fmt(due)}`;
  })();

  const raise = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateInvoicesAction(
        chosen.map((c) => c.leaseId),
        targetDateIso()
      );
      setResult({ generated: res.generated ?? chosen.length, message: res.message ?? "" });
      setStep(2);
      router.refresh();
    } catch {
      setError("The run did not finish. Nothing was raised — try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN.primary}>
        <span className="material-symbols-outlined text-[18px]">add</span>
        Raise invoices
      </button>

      {open && (
        <div
          {...backdropProps(close, "Raise invoices")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex dialog-h w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant/50 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold tracking-tight text-on-surface">
                  {step === 0 ? "Raise invoices" : step === 1 ? "Check what this will do" : "Done"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                  {step === 0
                    ? plan?.propertyName ?? "This property"
                    : `${monthLabel} · ${scope === "all" ? "every active lease" : `${picked.size} chosen`}`}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface-variant transition-colors hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <Steps current={step} />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {error && (
                <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {/* ---------------------------------------------- Step 1 */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="run-month" className="mb-1.5 block text-sm font-bold text-on-surface">
                      Which month are you billing?
                    </label>
                    <input
                      id="run-month"
                      type="month"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(e.target.value)}
                      className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-high px-3 text-sm font-semibold text-on-surface outline-none focus:border-primary"
                    />
                    {plan && (
                      <p className="mt-1.5 text-xs text-on-surface-variant">
                        Billing starts on the {plan.dates.invoiceCycleDay}
                        {plan.dates.invoiceCycleDay === 1 ? "st" : "th"} and is due{" "}
                        {plan.dates.gracePeriodDays} days later.
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-bold text-on-surface">Who gets an invoice?</span>
                    <div className="flex flex-col gap-2.5">
                      {([
                        {
                          key: "all" as const,
                          title: "Every active lease",
                          note: "The normal monthly run. Each lease is billed its recurring charges.",
                          count: plan
                            ? `${plan.billable.length} lease${plan.billable.length === 1 ? "" : "s"}`
                            : "…",
                        },
                        {
                          key: "pick" as const,
                          title: "Only leases I pick",
                          note: "For a correction, or a property you are part way through setting up.",
                          count: "choose next",
                        },
                      ]).map((o) => (
                        <label
                          key={o.key}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                            scope === o.key
                              ? "border-primary bg-primary/[0.08]"
                              : "border-outline-variant/60 bg-surface-container hover:border-outline-variant"
                          }`}
                        >
                          <input
                            type="radio"
                            name="scope"
                            checked={scope === o.key}
                            onChange={() => setScope(o.key)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#d0bcff]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-on-surface">{o.title}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">
                              {o.note}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 self-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              scope === o.key
                                ? "bg-primary/20 text-primary"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {o.count}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* The warning only the setup banner gives today. */}
                  {plan && plan.skipped.length > 0 && (
                    <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-4 py-3">
                      <span className="material-symbols-outlined mt-px shrink-0 text-[18px] text-amber-300">
                        error
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-amber-200">
                          {plan.skipped.length} lease{plan.skipped.length === 1 ? "" : "s"} will be left out
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                          A lease with no charges bills nothing, and one already invoiced this month would be
                          billed twice. You will see exactly which, and why, on the next step.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------- Step 2 */}
              {step === 1 && plan && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-primary/45 bg-primary/[0.08] px-5 py-4">
                    <p className="text-[15px] leading-relaxed text-on-surface">
                      This will raise{" "}
                      <strong className="tabular-nums">
                        {chosen.length} invoice{chosen.length === 1 ? "" : "s"}
                      </strong>{" "}
                      totalling{" "}
                      <strong className="tabular-nums">
                        <Money value={chosenTotal} />
                      </strong>
                      , dated {dueLabel}.
                    </p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      They are created as drafts. Nobody is billed until you issue them.
                    </p>
                  </div>

                  <section>
                    <h3 className="mb-2 text-sm font-bold text-on-surface">What will be created</h3>
                    <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container">
                      <table className="w-full border-collapse text-xs">
                        <caption className="sr-only">Invoices this run will create</caption>
                        <thead>
                          <tr className="bg-surface-container-high text-[10px] uppercase tracking-wider text-on-surface-variant">
                            {scope === "pick" && <th className="w-8 px-3 py-2" />}
                            <th className="px-3 py-2 text-left font-semibold">Unit</th>
                            <th className="px-3 py-2 text-left font-semibold">Resident</th>
                            <th className="px-3 py-2 text-left font-semibold">Charges</th>
                            <th className="px-3 py-2 text-right font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.billable.map((r) => (
                            <tr key={r.leaseId} className="border-t border-outline-variant/30">
                              {scope === "pick" && (
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={picked.has(r.leaseId)}
                                    onChange={() => toggle(r.leaseId)}
                                    aria-label={`Bill unit ${r.unitNumber}`}
                                    className="h-4 w-4 accent-[#d0bcff]"
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 font-bold text-on-surface">{r.unitNumber}</td>
                              <td className="px-3 py-2 text-on-surface-variant">{r.tenantName}</td>
                              <td className="px-3 py-2 text-on-surface-variant">{r.charges}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-on-surface">
                                <Money value={r.amount} />
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-outline-variant bg-surface-container-high">
                            <td
                              colSpan={scope === "pick" ? 4 : 3}
                              className="px-3 py-2.5 font-extrabold text-on-surface"
                            >
                              {chosen.length} invoice{chosen.length === 1 ? "" : "s"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-extrabold tabular-nums text-on-surface">
                              <Money value={chosenTotal} />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {plan.skipped.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-bold text-amber-200">What will be skipped, and why</h3>
                      <div className="overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/[0.06]">
                        {plan.skipped.map((s, i) => (
                          <div
                            key={s.leaseId}
                            className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${
                              i ? "border-t border-amber-500/25" : ""
                            }`}
                          >
                            <span className="min-w-[62px] font-bold text-on-surface">{s.unitNumber}</span>
                            <span className="min-w-0 flex-1 text-xs text-on-surface-variant">{s.why}</span>
                            <Link
                              href={s.fixHref}
                              className="whitespace-nowrap text-xs font-semibold text-primary hover:underline"
                            >
                              {s.fixLabel}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* ---------------------------------------------- Step 3 */}
              {step === 2 && result && (
                <div className="space-y-5 py-4 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15">
                    <span className="material-symbols-outlined text-[30px] text-emerald-300">check</span>
                  </span>
                  <div>
                    <h3 className="text-xl font-extrabold text-on-surface">
                      {result.generated} invoice{result.generated === 1 ? "" : "s"} raised
                    </h3>
                    <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-on-surface-variant">
                      {monthLabel}, totalling <Money value={chosenTotal} />. They are drafts — nobody has
                      been billed yet. Issue them from the invoice list when you are ready.
                    </p>
                  </div>
                  {plan && plan.skipped.length > 0 && (
                    <p className="mx-auto max-w-[46ch] rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-2.5 text-xs leading-relaxed text-amber-200">
                      {plan.skipped.length} lease{plan.skipped.length === 1 ? " was" : "s were"} left out, as
                      listed on the previous step. Nothing about them has changed.
                    </p>
                  )}
                </div>
              )}

              {loading && !plan && (
                <p className="py-10 text-center text-sm text-on-surface-variant">
                  Working out what this run would do…
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant/50 bg-surface-container-lowest px-5 py-3.5">
              {step === 0 && (
                <>
                  <button type="button" onClick={close} className={BTN.ghost}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!plan || loading || plan.billable.length === 0}
                    onClick={() => setStep(1)}
                    className={BTN.primary}
                  >
                    Check what this will do
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </>
              )}

              {step === 1 && (
                <>
                  <button type="button" onClick={() => setStep(0)} className={BTN.ghost}>
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading || chosen.length === 0}
                    onClick={raise}
                    className={BTN.primary}
                  >
                    {loading
                      ? "Raising…"
                      : `Raise ${chosen.length} invoice${chosen.length === 1 ? "" : "s"}`}
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <button type="button" onClick={close} className={BTN.ghost}>
                    Close
                  </button>
                  <Link href="/admin/invoices" onClick={close} className={BTN.primary}>
                    Open the invoices
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
