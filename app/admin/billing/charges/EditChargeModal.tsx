"use client";

import { useState, useActionState, useEffect } from "react";
import { updateChargeAction } from "./actions";

export default function EditChargeModal({
  charge,
  onClose,
}: {
  charge: any;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateChargeAction, null);
  const [isActive, setIsActive] = useState(charge.is_active);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container border border-outline-variant/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              edit_note
            </span>
            <h3 className="font-title-md text-title-md text-on-surface font-bold">
              Edit Master Charge
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {state?.error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="charge_id" value={charge.charge_id} />
          <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant">
              Charge Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="charge_name"
              defaultValue={charge.charge_name}
              required
              disabled={isPending}
              className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant">
              Charge Type
            </label>
            <select
              name="charge_type"
              defaultValue={charge.charge_type}
              disabled={isPending}
              className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm"
            >
              <option value="Recurring">Recurring (Monthly)</option>
              <option value="One-Off">One-Off</option>
              <option value="Penalty">Penalty</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-xs font-semibold text-on-surface-variant">
                Default Amt (RM)
              </label>
              <input
                type="number"
                step="0.01"
                name="default_amount"
                defaultValue={Number(charge.default_amount).toFixed(2)}
                required
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm font-medium"
              />
            </div>
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-xs font-semibold text-on-surface-variant">
                Billed per
              </label>
              <input
                type="text"
                name="uom"
                defaultValue={charge.uom}
                required
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={charge.description || ""}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm"
            ></textarea>
          </div>

          {/* Active / Inactive Status Toggle Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-high border border-outline-variant/60">
            <div>
              <div className="text-xs font-bold text-on-surface">Charge Status</div>
              <div className="text-[11px] text-on-surface-variant">
                {isActive ? "Active (Available for tenant billing)" : "Inactive (Hidden from new billing setups)"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-700 text-slate-300 border border-slate-600"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isActive ? "toggle_on" : "toggle_off"}
              </span>
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/40 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending && (
                <span className="material-symbols-outlined animate-spin text-[16px]">
                  progress_activity
                </span>
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
