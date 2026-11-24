"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SystemSettings } from "@/lib/settings";
import { saveSettingsAction } from "./actions";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ViewerButton } from "@/components/ui/MediaViewer";
import AdminAccountsPanel, { type AdminRow } from "./AdminAccountsPanel";

interface AdminSettingsClientProps {
  settings: SystemSettings;
  storageStatus: { configured: boolean; bucket: string | null };
  /** Most recent invoice, to preview the invoice wording on (DEV-191). */
  sampleInvoice: { id: string; no: string } | null;
  admins: AdminRow[];
  currentUserId: string;
}

/*
 * Grouped by consequence, not by subsystem (DEV-278, batch-4 `Settings`).
 *
 * Seven equal tabs in a row — General & Property, Billing & Finance, Invoice
 * Document, Helpdesk & SLA, Visitors & Security, Cloud & Storage,
 * Administrators — said nothing about which of them an admin should be
 * careful with. Changing the late fee and changing the storage bucket label
 * looked like the same kind of act.
 *
 * **Two groups: things that change what residents are charged, and things
 * that do not.** The names are what the setting does, not what module it
 * belongs to.
 */
type SettingsGroup = {
  heading: string;
  note: string;
  items: { id: string; label: string; icon: string; dot: string }[];
};

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    heading: "Costs money",
    note: "Changing these changes what a resident owes.",
    items: [
      { id: "billing", label: "What residents are charged", icon: "payments", dot: "bg-amber-400" },
      { id: "invoice", label: "The invoice document", icon: "receipt_long", dot: "bg-amber-400" },
    ],
  },
  {
    heading: "Costs nothing",
    note: "Wording, targets and access. Nobody is billed differently.",
    items: [
      { id: "general", label: "The property itself", icon: "tune", dot: "bg-slate-400" },
      { id: "helpdesk", label: "Repair response targets", icon: "support_agent", dot: "bg-slate-400" },
      { id: "visitors", label: "The gate", icon: "badge", dot: "bg-slate-400" },
      { id: "accounts", label: "Who can sign in as an admin", icon: "manage_accounts", dot: "bg-slate-400" },
      { id: "storage", label: "Plumbing", icon: "cloud", dot: "bg-emerald-400" },
    ],
  },
];

const ALL_TABS = SETTINGS_GROUPS.flatMap((g) => g.items);

export default function AdminSettingsClient({
  settings,
  storageStatus,
  sampleInvoice,
  admins,
  currentUserId,
}: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState("billing");
  /** A tab the admin asked for while this one still has unsaved edits. */
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /*
   * What is about to change, named (DEV-274).
   *
   * Seven tabs of parameters behind one Save button, and nothing told you
   * what you had touched. An admin who changed the grace period, wandered
   * into the invoice tab, changed a footer line and then hesitated had no
   * way to find out what was pending except to press Save and see.
   *
   * The form is uncontrolled — it is read with FormData on submit — so the
   * changes are tracked by diffing against a snapshot taken on mount, and
   * the human label comes from the DOM (the field's own <label>), not from
   * a hand-written map that would rot the moment somebody adds a field.
   */
  const formRef = useRef<HTMLFormElement | null>(null);
  const initial = useRef<Record<string, string> | null>(null);
  const [changed, setChanged] = useState<string[]>([]);

  const snapshot = (form: HTMLFormElement) => {
    const out: Record<string, string> = {};
    for (const [k, v] of new FormData(form).entries()) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  };

  const labelFor = (form: HTMLFormElement, name: string) => {
    const el = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
    if (!el) return name;
    /*
     * Three ways a field is labelled in this form, in order of reliability.
     * Most of them are an unassociated <label> sitting above the input in a
     * wrapper div — no `for`, no wrapping — so the first two miss and the
     * bar would print "SYSTEM_CURRENCY" at an administrator.
     */
    const byFor = el.id ? form.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    const wrapping = el.closest("label");
    /*
     * The field's OWN wrapper only, and only a <label>. Walking up two
     * levels reached the grid that holds the whole row, so editing
     * "System Base Currency" reported "Default Active Property" — the
     * neighbouring field's label, which is worse than printing the raw name.
     */
    const sibling = el.parentElement?.querySelector("label");
    const text = (byFor?.textContent || wrapping?.textContent || sibling?.textContent || "").trim();
    const clean = text.replace(/\s+/g, " ").replace(/\s*\*$/, "").trim();
    // A label longer than a label is helper text that got picked up instead.
    return clean && clean.length <= 48 ? clean : name;
  };

  const recompute = () => {
    const form = formRef.current;
    if (!form || !initial.current) return;
    const now = snapshot(form);
    const names = new Set([...Object.keys(initial.current), ...Object.keys(now)]);
    const diff: string[] = [];
    names.forEach((n) => {
      if ((initial.current?.[n] ?? "") !== (now[n] ?? "")) diff.push(labelFor(form, n));
    });
    setChanged(diff);
  };

  /*
   * Re-taken per panel, not once on mount. The panels unmount, so a baseline
   * captured on the first render describes fields that are no longer there
   * and misses every field that now is.
   */
  useEffect(() => {
    if (formRef.current) {
      initial.current = snapshot(formRef.current);
      setChanged([]);
    }
  }, [activeTab]);

  /*
   * Switching away discards, so say so (DEV-278).
   *
   * The form renders one panel at a time and the others are unmounted, so
   * their inputs are not in the DOM and `saveSettingsAction` deliberately
   * skips any key it was not sent. That is coherent — each panel owns a
   * disjoint set of keys — but it meant an edit made here and abandoned by
   * clicking another panel vanished with no word said. DEV-274's "unsaved
   * changes" bar could not warn about it either: it diffs the same FormData,
   * so once the panel unmounts the change is invisible to it too.
   *
   * The switch is now a decision rather than a silent loss.
   */
  const askToLeave = (next: string) => {
    if (next === activeTab) return;
    if (changed.length > 0) setLeavingTo(next);
    else setActiveTab(next);
  };

  const discardAndLeave = () => {
    const next = leavingTo;
    setLeavingTo(null);
    setChanged([]);
    // The panel unmounts on the next render, so the baseline is re-taken
    // from whatever the new panel shows.
    initial.current = null;
    if (next) setActiveTab(next);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await saveSettingsAction(formData);
        if (res.success) {
          if (formRef.current) initial.current = snapshot(formRef.current);
          setChanged([]);
          setToast({ message: res.message || "Settings updated successfully.", type: "success" });
        } else {
          setToast({ message: res.error || "Failed to update settings.", type: "error" });
        }
      } catch (err: any) {
        setToast({ message: err?.message || "An unexpected error occurred.", type: "error" });
      } finally {
        setTimeout(() => setToast(null), 4000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            toast.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-md"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-md"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Settings</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Each of these changes what residents are charged, told or allowed — so each one says
            which.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/*
          A rail grouped by consequence, not a row of seven equal tabs
          (DEV-278). Money first and separated, because that is the group
          where a wrong digit reaches a resident's bill.
        */}
        <nav
          aria-label="Settings groups"
          className="flex w-full shrink-0 flex-col gap-4 lg:w-[256px]"
        >
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="mb-1 px-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant/70">
                {group.heading}
              </p>
              <p className="mb-2 px-0.5 text-[11px] leading-snug text-on-surface-variant/60">
                {group.note}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((t) => {
                  const on = activeTab === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => askToLeave(t.id)}
                      aria-current={on ? "page" : undefined}
                      className={`pressable flex min-h-[42px] w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                        on
                          ? "border-primary/40 bg-primary/12 font-bold text-primary"
                          : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container hover:text-white"
                      }`}
                    >
                      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${t.dot}`} />
                      <span className="min-w-0 flex-1 truncate">{t.label}</span>
                      {on && changed.length > 0 && (
                        <span className="shrink-0 rounded-full border border-amber-500/35 bg-amber-500/15 px-1.5 py-px text-[10px] font-bold tabular-nums text-amber-300">
                          {changed.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
      {/* Settings Form Container */}
      {activeTab === "accounts" && (
        <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-lg">
          <AdminAccountsPanel admins={admins} currentUserId={currentUserId} />
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        // Any change anywhere in the seven tabs re-reads the whole form, which
        // is cheap and means a field added later is tracked for free.
        onChange={recompute}
        className={`p-6 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-lg space-y-6 ${
          activeTab === "accounts" ? "hidden" : ""
        }`}
      >
        {/* TAB 1: GENERAL & PROPERTY */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-white">General & Property Defaults</h3>
              <p className="text-[11px] text-on-surface-variant">Default building context and localized currency formatting</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Default Active Property
                </label>
                <select
                  name="defaultPropertyId"
                  defaultValue={settings.general.defaultPropertyId}
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                >
                  {settings.properties.map((p) => (
                    <option key={p.property_id} value={p.property_id}>
                      {p.property_name} {p.is_default ? "(Current Default)" : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Used as the primary building workspace when logging in.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  System Base Currency
                </label>
                <input
                  name="SYSTEM_CURRENCY"
                  type="text"
                  defaultValue={settings.general.systemCurrency}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Printed before every figure on invoices and receipts, e.g. RM.
                </span>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: BILLING & FINANCE */}
        {activeTab === "billing" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-white">Billing & Financial Rules</h3>
              <p className="text-[11px] text-on-surface-variant">Grace periods, overdue penalty calculations, and invoice cycles</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Days to pay (grace period)
                </label>
                <input
                  name="BILLING_GRACE_PERIOD_DAYS"
                  type="number"
                  min={1}
                  max={60}
                  defaultValue={settings.billing.gracePeriodDays}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  How long a resident has to pay. A generated invoice is due this many days after its date, and counts as overdue afterwards.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Invoice date (day of month)
                </label>
                <input
                  name="BILLING_INVOICE_CYCLE_DAY"
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={settings.billing.invoiceCycleDay}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  The day of the month a generated invoice is dated (1st - 28th).
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Tax / SST Registration No.
                </label>
                <input
                  name="BILLING_TAX_REG_NO"
                  type="text"
                  defaultValue={settings.billing.taxRegistrationNo}
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Printed on every invoice (preview and PDF).
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/30">
              <h4 className="text-xs font-bold text-white">Bank account for resident payments</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Shown on each resident&apos;s invoice page and printed on unpaid invoices. They transfer here, then upload proof for you to verify.
                Leave any field empty to hide the details.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Bank</label>
                <input
                  name="BILLING_BANK_NAME"
                  type="text"
                  defaultValue={settings.billing.bankName}
                  placeholder="e.g. Maybank"
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Account name</label>
                <input
                  name="BILLING_BANK_ACCOUNT_NAME"
                  type="text"
                  defaultValue={settings.billing.bankAccountName}
                  placeholder="e.g. Management Corporation"
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">Account number</label>
                <input
                  name="BILLING_BANK_ACCOUNT_NO"
                  type="text"
                  inputMode="numeric"
                  defaultValue={settings.billing.bankAccountNo}
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: INVOICE DOCUMENT (DEV-191) */}
        {activeTab === "invoice" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-outline-variant/30 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Invoice document</h3>
                <p className="text-[11px] text-on-surface-variant">
                  Wording printed on every invoice - the preview residents see and the PDF they download. Changes apply to all invoices, old and new.
                </p>
              </div>
              {sampleInvoice && (
                <ViewerButton
                  items={[{ src: `/print/invoice/${sampleInvoice.id}`, title: `Invoice ${sampleInvoice.no}`, kind: "doc", download: { url: `/api/invoices/${sampleInvoice.id}/pdf`, filename: `${sampleInvoice.no}.pdf` } }]}
                  className="px-3 py-2 rounded-xl border border-outline-variant text-xs font-bold text-white flex items-center gap-1.5 hover:bg-surface-container-high shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Preview on {sampleInvoice.no}
                </ViewerButton>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="INVOICE_ISSUER_NAME" className="block text-on-surface-variant font-medium mb-1">Issued by</label>
                <input
                  id="INVOICE_ISSUER_NAME"
                  name="INVOICE_ISSUER_NAME"
                  type="text"
                  maxLength={120}
                  defaultValue={settings.invoice.issuer}
                  placeholder="Leave empty to use the property name"
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  e.g. the management corporation. Shown at the top, above the property address.
                </span>
              </div>
              <div>
                <label htmlFor="INVOICE_CONTACT" className="block text-on-surface-variant font-medium mb-1">Office contact</label>
                <input
                  id="INVOICE_CONTACT"
                  name="INVOICE_CONTACT"
                  type="text"
                  maxLength={200}
                  defaultValue={settings.invoice.contact}
                  placeholder="e.g. Management office: 03-1234 5678 · office@example.com"
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">Printed at the foot of every page.</span>
              </div>
            </div>

            <div className="text-xs">
              <label htmlFor="INVOICE_TERMS" className="block text-on-surface-variant font-medium mb-1">Terms &amp; conditions</label>
              <textarea
                id="INVOICE_TERMS"
                name="INVOICE_TERMS"
                rows={7}
                maxLength={3000}
                defaultValue={settings.invoice.terms}
                className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white leading-relaxed focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                One term per line (up to 15) - they are numbered automatically. Leave empty to print no terms.
              </span>
            </div>

            <div className="text-xs">
              <label htmlFor="INVOICE_FOOTER" className="block text-on-surface-variant font-medium mb-1">Closing note</label>
              <input
                id="INVOICE_FOOTER"
                name="INVOICE_FOOTER"
                type="text"
                maxLength={300}
                defaultValue={settings.invoice.footer}
                className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <p className="text-[11px] text-on-surface-variant rounded-xl bg-surface-container-high/60 border border-outline-variant/40 p-3">
              Also printed automatically: the SST / Tax Reg. No and the bank account from <b className="text-white">Billing &amp; Finance</b> (bank details only on unpaid invoices, and only when all three fields are filled).
              Save first, then preview.
            </p>
          </div>
        )}

        {/* TAB 3: HELPDESK & SLA */}
        {activeTab === "helpdesk" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-white">Helpdesk SLA Target Guidelines</h3>
              <p className="text-[11px] text-on-surface-variant">Maximum target turnaround hours before a maintenance ticket is flagged as breached</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-rose-500/30">
                <span className="text-rose-400 font-bold uppercase text-[10px] block mb-1">
                  Urgent Priority SLA
                </span>
                <div className="flex items-center gap-2">
                  <input
                    name="MAINTENANCE_SLA_URGENT_HOURS"
                    type="number"
                    min={1}
                    max={72}
                    defaultValue={settings.helpdesk.slaUrgentHours}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <span className="text-on-surface-variant font-mono">hours</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-amber-500/30">
                <span className="text-amber-400 font-bold uppercase text-[10px] block mb-1">
                  High Priority SLA
                </span>
                <div className="flex items-center gap-2">
                  <input
                    name="MAINTENANCE_SLA_HIGH_HOURS"
                    type="number"
                    min={1}
                    max={168}
                    defaultValue={settings.helpdesk.slaHighHours}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <span className="text-on-surface-variant font-mono">hours</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-blue-500/30">
                <span className="text-blue-400 font-bold uppercase text-[10px] block mb-1">
                  Normal Priority SLA
                </span>
                <div className="flex items-center gap-2">
                  <input
                    name="MAINTENANCE_SLA_NORMAL_HOURS"
                    type="number"
                    min={1}
                    max={336}
                    defaultValue={settings.helpdesk.slaNormalHours}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <span className="text-on-surface-variant font-mono">hours</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/40">
                <span className="text-on-surface-variant font-bold uppercase text-[10px] block mb-1">
                  Low Priority SLA
                </span>
                <div className="flex items-center gap-2">
                  <input
                    name="MAINTENANCE_SLA_LOW_HOURS"
                    type="number"
                    min={1}
                    max={720}
                    defaultValue={settings.helpdesk.slaLowHours}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <span className="text-on-surface-variant font-mono">hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VISITORS & SECURITY */}
        {activeTab === "visitors" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-white">Visitor Pass & Guardhouse Security</h3>
              <p className="text-[11px] text-on-surface-variant">When a visitor who has not checked out counts as still on site</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Overstay alert after (hours)
                </label>
                <input
                  name="VISITOR_OVERSTAY_ALERT_HOURS"
                  type="number"
                  min={1}
                  max={48}
                  defaultValue={settings.visitors.overstayAlertHours}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  A checked-in visitor is flagged "not checked out" after this many hours, on the Visitors board and its counter.
                </span>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: CLOUD & STORAGE */}
        {activeTab === "storage" && (
          <div className="space-y-4">
            <div className="pb-3 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-white">Cloud Storage & Assets Configuration</h3>
              <p className="text-[11px] text-on-surface-variant">Asset upload limits and Firebase cloud storage endpoints</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Max File Upload Limit (MB)
                </label>
                <input
                  name="STORAGE_MAX_UPLOAD_MB"
                  type="number"
                  min={1}
                  max={4}
                  defaultValue={Math.min(settings.storage.maxUploadMb, 4)}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Applies to announcement photos and circulars. Hosting caps every upload at 4 MB.
                </span>
              </div>

              {/* Was an editable "Firebase base URL prefix" pointing at a bucket that
                  didn't exist, and nothing uploaded anywhere near it. The real
                  connection comes from server environment variables. */}
              <div>
                <span className="block text-on-surface-variant font-medium mb-1">File storage</span>
                <div
                  className={`rounded-xl border px-3 py-2 text-xs ${
                    storageStatus.configured
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  {storageStatus.configured ? (
                    <>
                      Firebase Storage connected
                      <span className="block font-mono text-[11px] text-on-surface-variant">{storageStatus.bucket}</span>
                    </>
                  ) : (
                    "Not connected - uploads are disabled until FIREBASE_* variables are set on the server"
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">System Health & Database Connectivity</span>
                  <span className="text-[11px] text-on-surface-variant">Neon PostgreSQL Connected • Next.js v16.2.7 Runtime</span>
                </div>
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HEALTHY
                </span>
              </div>
            </div>

            {/* Storage folder masterfile (user, 2026-09-16) */}
            <div className="pt-4 border-t border-outline-variant/30">
              <h4 className="text-xs font-bold text-white">Storage folders</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Where each kind of upload is saved in Firebase Storage. Changes apply to new uploads only &mdash;
                files already uploaded stay where they are and keep working.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-high/60 text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Upload</th>
                    <th className="px-3 py-2 font-semibold">Accepts</th>
                    <th className="px-3 py-2 font-semibold">Folder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {settings.storage.folders.map((f) => (
                    <tr key={f.key}>
                      <td className="px-3 py-2 font-medium text-white">{f.label}</td>
                      <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{f.accepts}</td>
                      <td className="px-3 py-2">
                        <input
                          name={f.key}
                          type="text"
                          defaultValue={f.folder}
                          required
                          pattern="[a-z0-9][a-z0-9_\-]{0,39}(/[a-z0-9][a-z0-9_\-]{0,39}){0,2}"
                          title="Lowercase letters, numbers, - or _, up to 3 levels separated by /"
                          placeholder={f.defaultFolder}
                          className="w-full min-w-[9rem] bg-surface-container-high border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Form Submission Bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant/30 pt-4">
          {changed.length > 0 && (
            <p className="mr-auto min-w-[240px] flex-[999_1_240px] text-xs leading-relaxed text-amber-200">
              <span className="font-bold">
                {changed.length} unsaved change{changed.length === 1 ? "" : "s"}:
              </span>{" "}
              <span className="text-on-surface-variant">{changed.slice(0, 4).join(", ")}</span>
              {changed.length > 4 && (
                <span className="text-on-surface-variant"> and {changed.length - 4} more</span>
              )}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            /* AGENTS.md Rule 4 / DEV-253: flat fill, not the `.btn-primary`
               gradient the rest of the admin panel stopped using. */
            className="pressable flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <LoadingSpinner size="xs" className="text-on-primary" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">save</span>
            )}
            <span>{isPending ? "Saving…" : "Save these settings"}</span>
          </button>
        </div>
      </form>
        </div>
      </div>

      {/*
        Leaving this panel throws the edits away, because the panels unmount
        and the save action is only sent the fields that were on screen. The
        loss used to be silent (DEV-278).
      */}
      {leavingTo && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#060a14]/80 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLeavingTo(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xl"
          >
            <h2 className="text-[15px] font-bold text-on-surface">
              {changed.length} unsaved change{changed.length === 1 ? "" : "s"} on this panel
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
              <span className="font-semibold text-amber-200">
                {changed.slice(0, 4).join(", ")}
                {changed.length > 4 ? ` and ${changed.length - 4} more` : ""}
              </span>{" "}
              will be thrown away if you move to{" "}
              <span className="font-semibold text-on-surface">
                {ALL_TABS.find((t) => t.id === leavingTo)?.label}
              </span>
              . Only the panel you are looking at is saved.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeavingTo(null)}
                className="pressable inline-flex h-10 items-center rounded-xl px-3.5 text-xs font-semibold text-on-surface-variant transition-colors hover:text-white"
              >
                Stay and save
              </button>
              <button
                type="button"
                onClick={discardAndLeave}
                className="pressable inline-flex h-10 items-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                Throw them away
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
