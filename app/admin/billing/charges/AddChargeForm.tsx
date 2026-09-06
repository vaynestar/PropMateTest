"use client";

import { useActionState, useEffect, useState } from "react";
import { createChargeAction } from "./actions";

export default function AddChargeForm() {
  const [state, formAction, isPending] = useActionState(createChargeAction, null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
  }, [state]);

  return (
    <div className="glass-card rounded-xl p-6 self-start relative overflow-hidden">
      <h2 className="font-title-md text-title-md text-on-surface mb-4">Add New Charge</h2>

      {isSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-slide-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          New charge master created!
        </div>
      )}

      {state?.error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold">
            Charge Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="charge_name"
            required
            disabled={isPending}
            placeholder="e.g. Monthly Rent / Water Fee"
            className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold">
            Charge Type
          </label>
          <select
            name="charge_type"
            disabled={isPending}
            className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm transition-colors"
          >
            <option value="Recurring">Recurring (Monthly)</option>
            <option value="One-Off">One-Off</option>
            <option value="Penalty">Penalty</option>
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1 w-1/2">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold">
              Default Amt (RM)
            </label>
            <input
              type="number"
              step="0.01"
              name="default_amount"
              required
              defaultValue="0.00"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm font-medium"
            />
          </div>
          <div className="flex flex-col gap-1 w-1/2">
            <label className="font-label-md text-on-surface-variant text-xs font-semibold">
              Billed per
            </label>
            <input
              type="text"
              name="uom"
              required
              defaultValue="Month"
              disabled={isPending}
              placeholder="e.g. Month / Unit"
              className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-label-md text-on-surface-variant text-xs font-semibold">
            Description
          </label>
          <textarea
            name="description"
            rows={2}
            disabled={isPending}
            placeholder="Optional description..."
            className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn-primary py-2.5 mt-2 font-label-md rounded-lg flex justify-center items-center gap-2 pressable disabled:opacity-50"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">add</span>
          )}
          {isPending ? "Creating Charge..." : "Create Charge"}
        </button>
      </form>
    </div>
  );
}
