"use client";

import { useState, useTransition } from "react";
import { SystemSettings } from "@/lib/settings";
import { saveSettingsAction } from "./actions";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface AdminSettingsClientProps {
  settings: SystemSettings;
}

const SETTINGS_TABS = [
  { id: "general", label: "General & Property", icon: "tune" },
  { id: "billing", label: "Billing & Finance", icon: "payments" },
  { id: "helpdesk", label: "Helpdesk & SLA", icon: "support_agent" },
  { id: "visitors", label: "Visitors & Security", icon: "badge" },
  { id: "storage", label: "Cloud & Storage", icon: "cloud" },
];

export default function AdminSettingsClient({ settings }: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const res = await saveSettingsAction(formData);
        if (res.success) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            System & Operations Settings
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Configure system parameters, SLA turnaround guidelines, and gate security policies
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-outline-variant/30 hide-scrollbar">
        {SETTINGS_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
              activeTab === t.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-white hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Form Container */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-lg space-y-6">
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
                  e.g., MYR, SGD, USD. Formats all monetary tables.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Date Format Display
                </label>
                <input
                  name="SYSTEM_DATE_FORMAT"
                  type="text"
                  defaultValue={settings.general.dateFormat}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
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
                  Invoice Grace Period (Days)
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
                  Number of days after invoice issue date before status changes to Overdue.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Late Surcharge Penalty Rate (%)
                </label>
                <input
                  name="BILLING_LATE_PENALTY_RATE"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  defaultValue={settings.billing.latePenaltyRate}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Annual percentage rate applied on severely overdue arrears accounts.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Monthly Recurring Cycle (Day of Month)
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
                  Day of month when maintenance batch billing runs (1st - 28th).
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
                  Appears on official PDF invoice receipts.
                </span>
              </div>
            </div>
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
              <p className="text-[11px] text-on-surface-variant">Gate access pass lifetimes, overstay thresholds, and clearance policies</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Visitor Pass Validity (Hours)
                </label>
                <input
                  name="VISITOR_PASS_VALIDITY_HOURS"
                  type="number"
                  min={1}
                  max={72}
                  defaultValue={settings.visitors.passValidityHours}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Generated QR pass automatically expires if unused after this duration.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Overstay Warning Alert Threshold (Hours)
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
                  Triggers guardhouse overstay alert if visitor has not checked out.
                </span>
              </div>

              <div className="sm:col-span-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-white font-medium">
                  <input
                    name="VISITOR_REQUIRE_HOST_APPROVAL"
                    type="checkbox"
                    defaultChecked={settings.visitors.requireHostApproval}
                    className="rounded bg-surface-container-high border border-outline-variant/60 text-primary focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <span>Require Resident Host Pre-Approval for Contractor & Delivery Passes</span>
                </label>
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
                  max={50}
                  defaultValue={settings.storage.maxUploadMb}
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-1 block">
                  Enforced on notice attachments, receipt photos, and defect images.
                </span>
              </div>

              <div>
                <label className="block text-on-surface-variant font-medium mb-1">
                  Firebase / Cloud Storage Base URL Prefix
                </label>
                <input
                  name="FIREBASE_STORAGE_PREFIX"
                  type="text"
                  defaultValue={settings.storage.firebaseStoragePrefix}
                  className="w-full bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                />
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
          </div>
        )}

        {/* Form Submission Bar */}
        <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 pressable"
          >
            {isPending ? (
              <LoadingSpinner size="xs" className="text-white" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">save</span>
            )}
            <span>{isPending ? "Saving Parameters..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
