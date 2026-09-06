"use client";

import { useState, useTransition } from "react";
import { toggleChargeActiveAction } from "./actions";
import EditChargeModal from "./EditChargeModal";
import { chargeType, RENT_CHARGE_NAME } from "@/lib/charge-type";

export default function ChargeTable({ charges }: { charges: any[] }) {
  const [editingCharge, setEditingCharge] = useState<any | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const handleToggleActive = (charge: any) => {
    setPendingId(charge.charge_id);
    setNotice(null);
    const formData = new FormData();
    formData.append("charge_id", charge.charge_id);
    formData.append("current_active", charge.is_active ? "true" : "false");

    startTransition(async () => {
      const result: any = await toggleChargeActiveAction(formData);
      setPendingId(null);
      if (result?.error) {
        setNotice({ type: "error", text: result.error });
        return;
      }
      // Switching a charge off does not touch the leases already billing it.
      // Saying so beats letting the admin assume the money has stopped.
      if (charge.is_active && result?.inUse > 0) {
        setNotice({
          type: "info",
          text: `${charge.charge_name} is hidden from the pickers, but ${result.inUse} ${
            result.inUse === 1 ? "lease is" : "leases are"
          } still billing it. Remove it from those leases to actually stop it.`,
        });
      }
    });
  };

  return (
    <>
      <div className="lg:col-span-2 glass-card rounded-xl p-0 overflow-hidden">
        {notice && (
          <div
            className={`flex items-start gap-2 border-b px-6 py-3 text-xs ${
              notice.type === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              {notice.type === "error" ? "error" : "info"}
            </span>
            <span className="min-w-0">{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
              className="ml-auto shrink-0 opacity-70 transition-opacity hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">close</span>
            </button>
          </div>
        )}
        <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-title-md text-title-md text-on-surface">
              Charges ({charges.length})
            </h2>
            <p className="text-xs text-on-surface-variant">
              Click a status to switch a charge on or off. Switching one off hides it
              when picking charges; leases already billing it carry on.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-container/50 border-b border-outline-variant text-on-surface-variant text-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Billed per</th>
                <th className="px-6 py-3 font-semibold text-right">Default amount</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                    No charges defined yet. Use the form to create your first charge.
                  </td>
                </tr>
              ) : (
                charges.map((c) => {
                  const isPending = pendingId === c.charge_id;
                  return (
                    <tr
                      key={c.charge_id}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-on-surface">{c.charge_name}</span>
                          {c.charge_name === RENT_CHARGE_NAME && (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-outline-variant/60 bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant"
                              title="Invoice generation finds the rent line by this name, so it cannot be renamed or switched off."
                            >
                              <span className="material-symbols-outlined text-[11px] leading-none">
                                lock
                              </span>
                              System
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <div className="text-[11px] text-on-surface-variant/70 truncate max-w-xs">
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const t = chargeType(c.charge_type);
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${t.badge}`}
                              title={t.hint}
                            >
                              <span className="material-symbols-outlined text-[13px] leading-none">
                                {t.icon}
                              </span>
                              {t.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{c.uom}</td>
                      <td className="px-6 py-4 text-right font-semibold text-on-surface">
                        {Number(c.default_amount) === 0 ? (
                          <span
                            className="text-on-surface-variant"
                            title="No default. The amount is set per lease when this charge is added."
                          >
                            Set per lease
                          </span>
                        ) : (
                          `RM ${Number(c.default_amount).toFixed(2)}`
                        )}
                      </td>

                      {/* Quick Status Toggle Button */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          disabled={isPending}
                          title={`Click to set as ${c.is_active ? "Inactive" : "Active"}`}
                          className={`px-2.5 py-1 text-xs rounded-full inline-flex items-center gap-1 transition-all cursor-pointer border ${
                            c.is_active
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                          } disabled:opacity-50`}
                        >
                          {isPending ? (
                            <span className="material-symbols-outlined animate-spin text-[14px]">
                              progress_activity
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">
                              {c.is_active ? "check_circle" : "cancel"}
                            </span>
                          )}
                          <span>{c.is_active ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Edit Button */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingCharge(c)}
                          className="px-3 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 hover:text-primary text-on-surface-variant text-xs font-semibold inline-flex items-center gap-1 transition-all border border-outline-variant/40"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCharge && (
        <EditChargeModal
          charge={editingCharge}
          onClose={() => setEditingCharge(null)}
        />
      )}
    </>
  );
}
