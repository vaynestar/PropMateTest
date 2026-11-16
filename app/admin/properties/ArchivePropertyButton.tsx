"use client";

import { useState, useTransition } from "react";
import { archiveProperty } from "./actions";

/**
 * Archiving, not deleting, is how a building leaves the register: its units,
 * tenancies and invoices stay readable, and deleting it would be refused by
 * the database anyway as soon as anything hangs off it.
 */
export default function ArchivePropertyButton({
  propertyId,
  propertyName,
  isArchived,
  unitCount,
}: {
  propertyId: string;
  propertyName: string;
  isArchived: boolean;
  unitCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (archived: boolean) => {
    const data = new FormData();
    data.set("property_id", propertyId);
    data.set("archived", String(archived));
    startTransition(async () => {
      const res = await archiveProperty(null, data);
      if (res?.error) setError(res.error);
      else setConfirming(false);
    });
  };

  if (isArchived) {
    return (
      <button
        type="button"
        onClick={() => submit(false)}
        disabled={isPending}
        className="pressable flex items-center justify-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[15px]">unarchive</span>
        {isPending ? "Restoring..." : "Restore"}
      </button>
    );
  }

  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <p className="text-[11px] text-on-surface-variant">
          {propertyName} will stop being offered anywhere. Its {unitCount}{" "}
          {unitCount === 1 ? "unit" : "units"} and their history stay, and you can restore it.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={isPending}
            className="pressable flex-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
          >
            {isPending ? "Archiving..." : "Yes, archive it"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-[11px] text-rose-300">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="pressable flex items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
    >
      <span className="material-symbols-outlined text-[15px]">archive</span>
      Archive
    </button>
  );
}
