"use client";

import { useState, useTransition } from "react";
import { toggleChargeActiveAction } from "./actions";
import EditChargeModal from "./EditChargeModal";

export default function ChargeTable({ charges }: { charges: any[] }) {
  const [editingCharge, setEditingCharge] = useState<any | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleToggleActive = (charge: any) => {
    setPendingId(charge.charge_id);
    const formData = new FormData();
    formData.append("charge_id", charge.charge_id);
    formData.append("current_active", charge.is_active ? "true" : "false");

    startTransition(async () => {
      await toggleChargeActiveAction(formData);
      setPendingId(null);
    });
  };

  return (
    <>
      <div className="lg:col-span-2 glass-card rounded-xl p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
          <div>
            <h2 className="font-title-md text-title-md text-on-surface">
              Charges ({charges.length})
            </h2>
            <p className="text-xs text-on-surface-variant">
              Click a status to switch a charge on or off. Inactive charges stop appearing on new invoices.
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
                <th className="px-6 py-3 font-semibold text-right">Default Amt</th>
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
                        <div className="font-medium text-on-surface">{c.charge_name}</div>
                        {c.description && (
                          <div className="text-[11px] text-on-surface-variant/70 truncate max-w-xs">
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-xs rounded bg-surface-container-high border border-outline-variant/50 text-on-surface-variant font-medium">
                          {c.charge_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{c.uom}</td>
                      <td className="px-6 py-4 text-right font-semibold text-on-surface">
                        RM {Number(c.default_amount).toFixed(2)}
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
