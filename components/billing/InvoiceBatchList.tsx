"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BTN, CARD, EmptyState, FIELD, Money, TABLE } from "@/components/admin/ui";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { updateInvoiceStatusAction, issueInvoice } from "@/app/admin/invoices/actions";
import EditInvoiceItemsModal from "./EditInvoiceItemsModal";
import InvoicePdfPreviewModal from "./InvoicePdfPreviewModal";
import VerifyPaymentModal from "./VerifyPaymentModal";
import { dayMonth } from "@/lib/short-date";

/**
 * The invoice list, rebuilt (DEV-253).
 *
 * What it was: three filter controls (a month select, a status select and a
 * date-range popover with five presets, two date pickers, an Apply, a Reset
 * and its own summary bar), then a 980px table in a horizontal scroller whose
 * last column held five 32px icon buttons with tooltips — preview, issue,
 * edit-or-lock, paid-or-unpaid, void-or-restore. Nothing was selectable, so
 * issuing a batch of twelve meant twelve confirm boxes. Voiding had no
 * confirmation at all. Each row also carried "Edited by: Admin1", which is for
 * nobody.
 *
 * What it is: a chip per state with its count — a count is a filter, never
 * decoration — one NAMED action per row for the likeliest next move, everything
 * else written out in a menu, tick boxes with a bulk bar, and real cards on a
 * phone instead of a table nobody can reach the right-hand side of.
 *
 * The date-range popover is gone. The month selector already answers "which
 * billing run", which is the only date question anyone asked of this screen,
 * and the popover was 170 lines of UI plus a second summary bar to explain
 * itself. Searching by unit, resident or invoice number covers the rest.
 */

function formatDate(date: Date | string) {
  return dayMonth(date, true);
}

function getMonthYear(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(date));
}

function daysPastDue(dueDate: Date | string) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

type StateKey = "draft" | "slip" | "overdue" | "unpaid" | "paid" | "void";

/**
 * One function decides a row's state, and the pill, the chips, the row colour
 * and the primary action all read from it. Previously each of those worked it
 * out again from `status`, `issued_at`, `due_date` and `transactions`, so a
 * row could be "Unpaid" in the badge and counted as overdue by the filter.
 */
function invoiceState(inv: any): { key: StateKey; label: string } {
  if (inv.status === "Inactive") return { key: "void", label: "Voided" };
  if (inv.status === "Paid") return { key: "paid", label: "Settled" };
  if (!inv.issued_at) return { key: "draft", label: "Draft, not sent" };
  if (inv.transactions?.[0]) return { key: "slip", label: "Slip to check" };
  if (daysPastDue(inv.due_date) > 0) return { key: "overdue", label: "Overdue" };
  return { key: "unpaid", label: "Issued, not due" };
}

const PILL: Record<StateKey, string> = {
  draft: "border-outline-variant/60 bg-surface-container-high text-on-surface-variant",
  slip: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  overdue: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unpaid: "border-outline-variant/60 bg-surface-container-high text-on-surface",
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  void: "border-outline-variant/40 bg-surface-container text-on-surface-variant",
};

const CHIPS: { key: "all" | StateKey; label: string; dot: string }[] = [
  { key: "all", label: "Everything", dot: "bg-on-surface-variant" },
  { key: "draft", label: "Draft, not sent", dot: "bg-slate-300" },
  { key: "slip", label: "Slip to check", dot: "bg-amber-400" },
  { key: "overdue", label: "Overdue", dot: "bg-rose-400" },
  { key: "paid", label: "Settled", dot: "bg-emerald-400" },
];

export default function InvoiceBatchList({
  invoices,
  chargeMasters = [],
}: {
  invoices: any[];
  chargeMasters?: any[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | StateKey>("all");
  const [month, setMonth] = useState("ALL");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<any | null>(null);
  const [verifying, setVerifying] = useState<any | null>(null);
  const [confirming, setConfirming] = useState<
    | null
    | { kind: "issue" | "void" | "restore" | "paid" | "unpaid"; invoice: any }
    | { kind: "issueMany"; ids: string[] }
  >(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [pending, startTransition] = useTransition();

  /* ----------------------------------------------------------------- *
   * Filtering
   * ----------------------------------------------------------------- */

  const months = useMemo(() => {
    const seen = new Map<string, number>();
    for (const inv of invoices) {
      const key = getMonthYear(inv.invoice_date);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return [...seen.entries()].sort(
      (a, b) =>
        new Date(invoices.find((i) => getMonthYear(i.invoice_date) === b[0])!.invoice_date).getTime() -
        new Date(invoices.find((i) => getMonthYear(i.invoice_date) === a[0])!.invoice_date).getTime()
    );
  }, [invoices]);

  // The month narrows first, so the chip counts describe the batch on screen
  // rather than the whole ledger.
  const inMonth = useMemo(
    () => (month === "ALL" ? invoices : invoices.filter((i) => getMonthYear(i.invoice_date) === month)),
    [invoices, month]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inMonth.length };
    for (const inv of inMonth) {
      const { key } = invoiceState(inv);
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [inMonth]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inMonth.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoice_no?.toLowerCase().includes(q) ||
        inv.lease?.unit?.unit_number?.toLowerCase().includes(q) ||
        inv.lease?.tenant?.user_name?.toLowerCase().includes(q);
      const matchesState = stateFilter === "all" || invoiceState(inv).key === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [inMonth, search, stateFilter]);

  const draftsOnScreen = rows.filter((inv) => invoiceState(inv).key === "draft");
  const pickedDrafts = draftsOnScreen.filter((inv) => picked.has(inv.invoice_id));

  /* ----------------------------------------------------------------- *
   * Actions. Each one owns its confirm dialog; none uses window.confirm.
   * ----------------------------------------------------------------- */

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const run = (fn: () => Promise<{ success?: boolean; message?: string; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.success) {
          setToast({ message: res.message ?? "Done", tone: "success" });
          after?.();
          router.refresh();
        } else {
          setToast({ message: res.error ?? "That did not work", tone: "error" });
        }
      } catch (e: any) {
        setToast({ message: e?.message || "That did not work", tone: "error" });
      } finally {
        setConfirming(null);
      }
    });

  const doIssueMany = (ids: string[]) =>
    startTransition(async () => {
      let ok = 0;
      const failed: string[] = [];
      for (const id of ids) {
        try {
          const res = await issueInvoice(id);
          res.success ? ok++ : failed.push(id);
        } catch {
          failed.push(id);
        }
      }
      setConfirming(null);
      setPicked(new Set());
      setToast(
        failed.length
          ? {
              message: `${ok} issued, ${failed.length} would not go`,
              detail: "The ones that failed are still drafts. Try them one at a time to see why.",
              tone: "error",
            }
          : {
              message: `${ok} invoice${ok === 1 ? "" : "s"} issued`,
              detail: "Residents can see them now. The line items are locked.",
              tone: "success",
            }
      );
      router.refresh();
    });

  /** The one named button on a row: the likeliest next move for that state. */
  function primaryAction(inv: any, key: StateKey) {
    switch (key) {
      case "draft":
        return {
          label: "Issue to resident",
          primary: true,
          onClick: () => setConfirming({ kind: "issue", invoice: inv }),
        };
      case "slip":
        return {
          label: "Check the slip",
          primary: true,
          onClick: () => setVerifying(inv),
        };
      case "overdue":
      case "unpaid":
        return {
          label: "Record a payment",
          primary: false,
          onClick: () => setConfirming({ kind: "paid", invoice: inv }),
        };
      case "paid":
        return { label: "View receipt", primary: false, onClick: () => setPdfInvoice(inv) };
      default:
        return null;
    }
  }

  function menuItems(inv: any, key: StateKey): RowMenuItem[] {
    const items: RowMenuItem[] = [
      { label: "Open the invoice PDF", onSelect: () => setPdfInvoice(inv) },
      { label: "Every invoice on this lease", onSelect: () => router.push(`/admin/invoices?lease=${inv.lease_id}`) },
    ];

    if (key === "draft") {
      items.push({ label: "Edit the line items", onSelect: () => setEditingInvoice(inv) });
    } else if (key !== "void") {
      items.push({
        label: "Unlock for editing",
        hint: "Issued invoices need your password to change",
        onSelect: () => setEditingInvoice(inv),
      });
    }

    if (key === "paid") {
      items.push({
        label: "Move it back to unpaid",
        hint: "If the payment bounced or was recorded twice",
        onSelect: () => setConfirming({ kind: "unpaid", invoice: inv }),
      });
    } else if (key !== "void" && key !== "draft") {
      items.push({
        label: "Mark it paid by hand",
        hint: "Cash or a transfer you have already seen",
        onSelect: () => setConfirming({ kind: "paid", invoice: inv }),
      });
    }

    if (key === "void") {
      items.push({
        label: "Bring it back into the books",
        onSelect: () => setConfirming({ kind: "restore", invoice: inv }),
      });
    } else {
      items.push({
        label: "Void this invoice…",
        danger: true,
        onSelect: () => setConfirming({ kind: "void", invoice: inv }),
      });
    }

    return items;
  }

  /* ----------------------------------------------------------------- *
   * Render
   * ----------------------------------------------------------------- */

  const dialog = (() => {
    if (!confirming) return null;
    if (confirming.kind === "issueMany") {
      const n = confirming.ids.length;
      return {
        tone: "primary" as const,
        title: `Issue ${n} invoice${n === 1 ? "" : "s"} to residents?`,
        body: (
          <p>
            All {n} appear in the resident app straight away and each resident is notified. Their line items lock
            afterwards.
          </p>
        ),
        confirmLabel: `Issue all ${n}`,
        cancelLabel: "Leave them as drafts",
        irreversible: "Issuing cannot be undone — a correction needs an unlock, with your password.",
        onConfirm: () => doIssueMany((confirming as any).ids),
      };
    }

    const inv = (confirming as any).invoice;
    const who = inv.lease?.tenant?.user_name ?? "the resident";
    const unit = inv.lease?.unit?.unit_number ?? "—";
    const amount = Number(inv.total_amount ?? 0);
    const asMoney = `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;

    switch (confirming.kind) {
      case "issue":
        return {
          tone: "primary" as const,
          title: `Issue ${inv.invoice_no} to ${who}?`,
          body: (
            <p>
              Unit {unit} &middot; {asMoney}, due {formatDate(inv.due_date)}. It appears in their app straight away.
            </p>
          ),
          confirmLabel: "Issue it",
          cancelLabel: "Leave it as a draft",
          irreversible: "The line items lock afterwards. Correcting them needs an unlock, with your password.",
          onConfirm: () => run(() => issueInvoice(inv.invoice_id)),
        };
      case "void":
        return {
          tone: "danger" as const,
          title: `Void ${inv.invoice_no}?`,
          body: (
            <p>
              {asMoney} comes off what unit {unit} owes, and the number {inv.invoice_no} is never reused. {who} sees it
              marked void.
            </p>
          ),
          confirmLabel: "Void it",
          cancelLabel: "Keep it",
          irreversible: "A voided invoice can be brought back, but the resident will have seen it go.",
          onConfirm: () => run(() => updateInvoiceStatusAction(inv.invoice_id, "Inactive")),
        };
      case "restore":
        return {
          tone: "primary" as const,
          title: `Bring ${inv.invoice_no} back into the books?`,
          body: (
            <p>
              {asMoney} is owed by unit {unit} again, and {who} sees it as unpaid.
            </p>
          ),
          confirmLabel: "Bring it back",
          cancelLabel: "Leave it voided",
          onConfirm: () => run(() => updateInvoiceStatusAction(inv.invoice_id, "Unpaid")),
        };
      case "paid":
        return {
          tone: "primary" as const,
          title: `Record ${asMoney} against ${inv.invoice_no}?`,
          body: (
            <p>
              Unit {unit} &middot; {who}. Use this for cash or a transfer you have already checked. A slip the resident
              sent should go through <strong className="text-on-surface">Check the slip</strong> instead, so their proof
              is kept with the payment.
            </p>
          ),
          confirmLabel: "Record it as paid",
          cancelLabel: "Not yet",
          onConfirm: () => run(() => updateInvoiceStatusAction(inv.invoice_id, "Paid")),
        };
      case "unpaid":
        return {
          tone: "danger" as const,
          title: `Move ${inv.invoice_no} back to unpaid?`,
          body: (
            <p>
              {asMoney} is owed by unit {unit} again and it will start counting as arrears from its due date,{" "}
              {formatDate(inv.due_date)}.
            </p>
          ),
          confirmLabel: "Move it back",
          cancelLabel: "Leave it settled",
          onConfirm: () => run(() => updateInvoiceStatusAction(inv.invoice_id, "Unpaid")),
        };
    }
  })();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* A count is a filter. These five replace a status dropdown nobody
          could read a total out of. */}
      <nav aria-label="Filter by state" className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => {
          const n = counts[chip.key] ?? 0;
          const on = stateFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={on}
              onClick={() => setStateFilter(chip.key)}
              className={`pressable inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm transition-colors ${
                on
                  ? "border-primary bg-primary/15 font-bold text-primary"
                  : "border-outline-variant/60 bg-surface-container font-semibold text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${chip.dot}`} aria-hidden="true" />
              {chip.label}
              <span
                className={`rounded-full px-2 py-px text-[11px] font-bold tabular-nums ${
                  on ? "bg-primary/25 text-primary" : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="inv-q" className="sr-only">
            Search invoices
          </label>
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="inv-q"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Unit, resident or invoice number"
            className={`${FIELD} h-11 w-full rounded-xl pl-10`}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="inv-month"
            className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Month
          </label>
          <select
            id="inv-month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPicked(new Set());
            }}
            className={`${FIELD} h-11 min-w-[190px] cursor-pointer rounded-xl font-semibold`}
          >
            <option value="ALL">All months ({invoices.length})</option>
            {months.map(([key, n]) => (
              <option key={key} value={key}>
                {key} ({n})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* The bulk bar. Raising twelve invoices used to be followed by issuing
          them twelve times, through twelve browser confirm boxes. */}
      {pickedDrafts.length > 0 && (
        <div className="animate-fade-in flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/[0.08] px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-xs font-bold tabular-nums text-primary">
            {pickedDrafts.length}
          </span>
          <span className="min-w-0 flex-1 basis-[240px] text-[13px] text-on-surface">
            {pickedDrafts.length === picked.size ? (
              <>Selected, all of them drafts.</>
            ) : (
              <>
                {pickedDrafts.length} of the {picked.size} selected can be issued — the rest are already out.
              </>
            )}
          </span>
          <button type="button" onClick={() => setPicked(new Set())} className={BTN.ghost}>
            Clear
          </button>
          <button
            type="button"
            onClick={() => setConfirming({ kind: "issueMany", ids: pickedDrafts.map((i) => i.invoice_id) })}
            className={BTN.primary}
          >
            Issue all {pickedDrafts.length}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className={CARD}>
          {invoices.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title="No invoices yet"
              hint="Nothing has been billed for this property. Units with recurring charges set up are waiting for the first run."
              action={
                <Link href="/admin/billing" className={BTN.primary}>
                  Generate a billing run
                </Link>
              }
              secondary={
                <>
                  Or{" "}
                  <Link href="/admin/billing" className="font-semibold text-primary hover:underline">
                    write a one-off invoice
                  </Link>
                </>
              }
            />
          ) : (
            <EmptyState
              icon="filter_alt_off"
              title="Nothing matches that"
              hint={
                stateFilter === "all"
                  ? `No invoice in ${month === "ALL" ? "the ledger" : month} matches “${search}”.`
                  : `No ${CHIPS.find((c) => c.key === stateFilter)?.label.toLowerCase()} invoice${
                      month === "ALL" ? "" : ` in ${month}`
                    }.`
              }
              action={
                <button
                  type="button"
                  onClick={() => {
                    setStateFilter("all");
                    setSearch("");
                    setMonth("ALL");
                  }}
                  className={BTN.secondary}
                >
                  Show everything
                </button>
              }
            />
          )}
        </div>
      ) : (
        <>
          {/* ---------- Desktop ----------
              The table appears at xl, not lg. Seven columns in the ~760px a
              1024px laptop has left after the sidebar meant the invoice
              number wrapped onto three lines and the action column fell off
              the edge into a horizontal scroller — the thing this rewrite
              exists to remove. Cards read better there, so cards it is. */}
          <section className={`${CARD} hidden overflow-hidden xl:block`}>
            <div className={TABLE.wrap}>
              <table className={TABLE.table}>
                <caption className="sr-only">
                  Invoices for {month === "ALL" ? "every month" : month}, newest first
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={`${TABLE.th} w-12 pr-0`}>
                      <input
                        type="checkbox"
                        aria-label="Select every draft on screen"
                        checked={draftsOnScreen.length > 0 && pickedDrafts.length === draftsOnScreen.length}
                        onChange={(e) =>
                          setPicked(e.target.checked ? new Set(draftsOnScreen.map((i) => i.invoice_id)) : new Set())
                        }
                        disabled={draftsOnScreen.length === 0}
                        className="h-4 w-4 accent-primary disabled:opacity-30"
                      />
                    </th>
                    <th scope="col" className={TABLE.th}>
                      Invoice
                    </th>
                    <th scope="col" className={TABLE.th}>
                      Unit &amp; resident
                    </th>
                    <th scope="col" className={TABLE.th}>
                      Due
                    </th>
                    <th scope="col" className={TABLE.thNum}>
                      Amount
                    </th>
                    <th scope="col" className={TABLE.th}>
                      State
                    </th>
                    <th scope="col" className={TABLE.thNum}>
                      What happens next
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inv) => {
                    const { key, label } = invoiceState(inv);
                    const late = daysPastDue(inv.due_date);
                    const action = primaryAction(inv, key);
                    const slip = key === "slip" ? inv.transactions[0] : null;
                    return (
                      <tr key={inv.invoice_id} className={key === "void" ? `${TABLE.tr} opacity-55` : TABLE.tr}>
                        <td className="pl-4 align-top pt-4">
                          <input
                            type="checkbox"
                            aria-label={`Select invoice ${inv.invoice_no}`}
                            checked={picked.has(inv.invoice_id)}
                            onChange={() => toggle(inv.invoice_id)}
                            disabled={key !== "draft"}
                            title={key === "draft" ? undefined : "Only drafts can be issued in a batch"}
                            className="h-4 w-4 accent-primary disabled:opacity-20"
                          />
                        </td>
                        <td className={`${TABLE.td} align-top`}>
                          <span className="whitespace-nowrap font-mono text-[11.5px] font-semibold text-on-surface-variant">
                            {inv.invoice_no}
                          </span>
                          {inv.is_printed && (
                            <span className="mt-1 block text-[10.5px] text-on-surface-variant/70">Printed</span>
                          )}
                        </td>
                        <td className={`${TABLE.td} align-top`}>
                          <Link
                            href={`/admin/invoices?lease=${inv.lease_id}`}
                            className="w-max font-semibold text-on-surface decoration-primary/40 underline-offset-4 hover:underline"
                          >
                            {inv.lease?.unit?.unit_number ?? "—"}
                          </Link>
                          <span className="mt-0.5 block text-xs text-on-surface-variant">
                            {inv.lease?.tenant?.user_name ?? "No tenant on the lease"}
                          </span>
                          {/* The slip, on the row. It was a 10px chip that
                              said only "Verify payment", so judging it meant
                              opening a modal for every one. */}
                          {slip && (
                            <span className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11.5px] text-amber-200">
                              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                                receipt
                              </span>
                              <Money value={Number(slip.transaction_amount ?? 0)} className="font-semibold" />
                              {slip.reference_number && (
                                <span className="font-mono text-amber-200/80">· {slip.reference_number}</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className={`${TABLE.td} whitespace-nowrap align-top text-xs tabular-nums`}>
                          <span className={late > 0 && key !== "paid" ? "text-rose-300" : "text-on-surface-variant"}>
                            {formatDate(inv.due_date)}
                          </span>
                          <span
                            className={`mt-0.5 block text-[11px] font-semibold ${
                              key === "draft"
                                ? "text-on-surface-variant"
                                : key === "paid"
                                  ? "text-on-surface-variant"
                                  : late > 30
                                    ? "text-rose-300"
                                    : late > 0
                                      ? "text-amber-300"
                                      : "text-on-surface-variant"
                            }`}
                          >
                            {key === "draft"
                              ? "Not issued yet"
                              : key === "paid"
                                ? "Settled"
                                : late > 0
                                  ? `${late} day${late === 1 ? "" : "s"} late`
                                  : `in ${Math.abs(late)} day${late === -1 ? "" : "s"}`}
                          </span>
                        </td>
                        <td className={`${TABLE.tdNum} align-top font-semibold`}>
                          <Money value={Number(inv.total_amount ?? 0)} />
                          {/* A part payment is money in the bank, and the row
                              said nothing about it (DEV-260). */}
                          {Number(inv.paidSoFar ?? 0) > 0 && key !== "paid" && key !== "void" && (
                            <span className="mt-0.5 block whitespace-nowrap text-[11px] font-medium text-emerald-300">
                              <Money value={Number(inv.paidSoFar)} /> paid
                            </span>
                          )}
                        </td>
                        <td className={`${TABLE.td} align-top`}>
                          <span
                            className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${PILL[key]}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className={`${TABLE.td} align-top`}>
                          <div className="flex items-start justify-end gap-2">
                            {action && (
                              <button
                                type="button"
                                onClick={action.onClick}
                                disabled={pending}
                                className={`pressable inline-flex h-10 items-center whitespace-nowrap rounded-xl px-3.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                  action.primary
                                    ? "bg-primary text-on-primary hover:bg-primary/90"
                                    : "border border-outline-variant/60 bg-surface-container-high font-semibold text-on-surface hover:bg-surface-container-highest"
                                }`}
                              >
                                {action.label}
                              </button>
                            )}
                            <RowMenu label={`More actions for invoice ${inv.invoice_no}`} items={menuItems(inv, key)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-outline-variant/40 bg-surface-container-high px-4 py-3 text-xs text-on-surface-variant">
              <span>
                <strong className="tabular-nums text-on-surface">{rows.length}</strong> shown
                {rows.length !== invoices.length && <> of {invoices.length} on record</>}
              </span>
              <span className="tabular-nums">
                <Money
                  value={rows
                    .filter((i) => invoiceState(i).key !== "void")
                    .reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0)}
                  className="font-semibold text-on-surface"
                />{" "}
                billed on screen
              </span>
            </div>
          </section>

          {/* ---------- Phone and tablet ---------- */}
          <div className="flex flex-col gap-2.5 xl:hidden">
            {rows.map((inv) => {
              const { key, label } = invoiceState(inv);
              const late = daysPastDue(inv.due_date);
              const action = primaryAction(inv, key);
              const slip = key === "slip" ? inv.transactions[0] : null;
              return (
                <article
                  key={inv.invoice_id}
                  className={`rounded-2xl border bg-surface-container p-4 ${
                    key === "overdue" || key === "slip"
                      ? key === "slip"
                        ? "border-amber-500/40"
                        : "border-rose-500/40"
                      : "border-outline-variant/50"
                  } ${key === "void" ? "opacity-55" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[11.5px] font-semibold text-on-surface-variant">
                      {inv.invoice_no}
                    </span>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${PILL[key]}`}
                    >
                      {label}
                    </span>
                  </div>

                  <p className="mt-2 text-[15px] font-bold text-white">{inv.lease?.unit?.unit_number ?? "—"}</p>
                  <p className="text-[13px] text-on-surface-variant">
                    {inv.lease?.tenant?.user_name ?? "No tenant on the lease"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="flex items-baseline gap-2">
                      <Money
                        value={Number(inv.total_amount ?? 0)}
                        className="text-xl font-bold tracking-tight text-white"
                      />
                      {Number(inv.paidSoFar ?? 0) > 0 && key !== "paid" && key !== "void" && (
                        <span className="whitespace-nowrap text-[11px] font-medium text-emerald-300">
                          <Money value={Number(inv.paidSoFar)} /> paid
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        key === "draft" || key === "paid"
                          ? "text-on-surface-variant"
                          : late > 30
                            ? "text-rose-300"
                            : late > 0
                              ? "text-amber-300"
                              : "text-on-surface-variant"
                      }`}
                    >
                      {key === "draft"
                        ? "Not issued yet"
                        : key === "paid"
                          ? "Settled"
                          : late > 0
                            ? `${late} day${late === 1 ? "" : "s"} late`
                            : `due ${formatDate(inv.due_date)}`}
                    </span>
                  </div>

                  {slip && (
                    <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-200">
                      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                        receipt
                      </span>
                      <Money value={Number(slip.transaction_amount ?? 0)} className="font-semibold" />
                      {slip.reference_number && <span className="font-mono">· {slip.reference_number}</span>}
                    </p>
                  )}

                  <div className="mt-3.5 flex items-center gap-2">
                    {action && (
                      <button
                        type="button"
                        onClick={action.onClick}
                        disabled={pending}
                        className={`pressable inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-xl px-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                          action.primary
                            ? "bg-primary text-on-primary hover:bg-primary/90"
                            : "border border-outline-variant/60 bg-surface-container-high font-semibold text-on-surface"
                        }`}
                      >
                        {action.label}
                      </button>
                    )}
                    <RowMenu label={`More actions for invoice ${inv.invoice_no}`} items={menuItems(inv, key)} />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {dialog && (
        <ConfirmDialog
          open
          tone={dialog.tone}
          title={dialog.title}
          body={dialog.body}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          irreversible={dialog.irreversible}
          pending={pending}
          onConfirm={dialog.onConfirm}
          onClose={() => setConfirming(null)}
        />
      )}

      {editingInvoice && (
        <EditInvoiceItemsModal
          invoice={editingInvoice}
          chargeMasters={chargeMasters}
          onClose={() => setEditingInvoice(null)}
        />
      )}

      {verifying?.transactions?.[0] && (
        <VerifyPaymentModal
          submission={verifying.transactions[0]}
          invoiceNo={verifying.invoice_no}
          amount={Number(verifying.total_amount)}
          tenantName={verifying.lease?.tenant?.user_name ?? "Tenant"}
          unitNumber={verifying.lease?.unit?.unit_number ?? "-"}
          onClose={() => setVerifying(null)}
          onDone={(message) => {
            setVerifying(null);
            setToast({ message, tone: "success" });
            router.refresh();
          }}
        />
      )}

      {pdfInvoice && (
        <InvoicePdfPreviewModal
          invoice={pdfInvoice}
          onClose={() => setPdfInvoice(null)}
          onPrinted={() => {
            setPdfInvoice((prev: any) => (prev ? { ...prev, is_printed: true } : null));
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
