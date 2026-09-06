"use client";

import { useState, useActionState, useEffect } from "react";
import { updateChargeAction } from "./actions";
import {
  CHARGE_TYPES,
  CHARGE_TYPE_ORDER,
  chargeType,
  RENT_CHARGE_NAME,
  type ChargeTypeKey,
} from "@/lib/charge-type";

export default function EditChargeModal({
  charge,
  onClose,
}: {
  charge: any;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(updateChargeAction, null);
  const [isActive, setIsActive] = useState(charge.is_active);

  // The stored value may be a legacy spelling ("One-Off", "Penalty"), which
  // matched no <option>, so the select silently showed the FIRST one —
  // "Recurring" — and saving converted a one-off fee into a monthly charge on
  // every tenant. Normalise before seeding the control.
  const [type, setType] = useState<ChargeTypeKey>(chargeType(charge.charge_type).value);
  const isRentCharge = charge.charge_name === RENT_CHARGE_NAME;

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
              Edit charge
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

        {isRentCharge && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <span className="material-symbols-outlined text-[18px] leading-none">info</span>
            <span className="min-w-0">
              Invoice generation looks this charge up by name, so its name, type and
              on/off state are fixed. The amount and description can still change.
            </span>
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
              readOnly={isRentCharge}
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
              value={type}
              onChange={(e) => setType(e.target.value as ChargeTypeKey)}
              disabled={isPending || isRentCharge}
              className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm disabled:opacity-60"
            >
              {CHARGE_TYPE_ORDER.map((k) => (
                <option key={k} value={k}>
                  {CHARGE_TYPES[k].label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-on-surface-variant">{CHARGE_TYPES[type].hint}</p>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 w-1/2">
              <label className="text-xs font-semibold text-on-surface-variant">
                Default amount (RM)
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
