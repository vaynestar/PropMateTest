"use client";

import { useState, useActionState, useEffect } from "react";
import { addLeaseChargeAction } from "./actions";

type ChargeMaster = {
  charge_id: string;
  charge_name: string;
  default_amount: any;
};

export default function AddLeaseChargeForm({
  lease_id,
  activeCharges,
}: {
  lease_id: string;
  activeCharges: ChargeMaster[];
}) {
  const [selectedChargeId, setSelectedChargeId] = useState(
    activeCharges[0]?.charge_id || ""
  );
  const [amount, setAmount] = useState(
    activeCharges[0] ? Number(activeCharges[0].default_amount).toFixed(2) : ""
  );
  const [quantity, setQuantity] = useState("1");

  const [state, formAction, isPending] = useActionState(addLeaseChargeAction, null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-populate default amount when selecting a charge
  const handleChargeSelect = (chargeId: string) => {
    setSelectedChargeId(chargeId);
    const found = activeCharges.find((c) => c.charge_id === chargeId);
    if (found) {
      setAmount(Number(found.default_amount).toFixed(2));
    }
  };

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
  }, [state]);

  if (activeCharges.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 self-start">
        <h2 className="font-title-md text-title-md text-on-surface mb-2">Add Charge</h2>
        <p className="text-xs text-on-surface-variant">
          No active Master Charges found. Please create charges in <strong className="text-primary">Billing &gt; Charge Master</strong> first.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 self-start relative overflow-hidden">
      <h2 className="font-title-md text-title-md text-on-surface mb-4">Add Charge</h2>

      {isSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-slide-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Charge added to tenant bill!
        </div>
      )}

      {state?.error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="lease_id" value={lease_id} />

        <div className="flex flex-col gap-1">
          <label className="font-label-md text-on-surface-variant text-xs">
            Select Master Charge
          </label>
          <select
            name="charge_id"
            value={selectedChargeId}
            onChange={(e) => handleChargeSelect(e.target.value)}
            required
            disabled={isPending}
            className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm transition-colors"
          >
            {activeCharges.map((c) => (
              <option key={c.charge_id} value={c.charge_id}>
                {c.charge_name} (RM {Number(c.default_amount).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1 w-1/2">
            <label className="font-label-md text-on-surface-variant text-xs">
              Amount (RM)
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isPending}
              placeholder="0.00"
              className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm font-medium"
            />
          </div>
          <div className="flex flex-col gap-1 w-1/2">
            <label className="font-label-md text-on-surface-variant text-xs">
              Quantity
            </label>
            <input
              type="number"
              step="0.01"
              name="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none text-sm font-medium"
            />
          </div>
        </div>

        <p className="text-[11px] text-on-surface-variant/80 italic mt-0.5 leading-relaxed">
          💡 You can override the default rate for this specific resident.
        </p>

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
          {isPending ? "Adding Charge..." : "Add to Bill"}
        </button>
      </form>
    </div>
  );
}
