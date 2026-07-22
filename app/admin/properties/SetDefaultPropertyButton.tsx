"use client";

import { useTransition } from "react";
import { setActiveProperty } from "@/app/actions/property-actions";

export default function SetDefaultPropertyButton({
  propertyId,
  isDefault,
}: {
  propertyId: string;
  isDefault: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (isDefault) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-label-md text-xs font-semibold shadow-sm">
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
        Default Property
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        startTransition(() => {
          setActiveProperty(propertyId);
        });
      }}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all text-xs font-medium pressable disabled:opacity-50"
    >
      {isPending ? (
        <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
      ) : (
        <span className="material-symbols-outlined text-[16px]">star</span>
      )}
      {isPending ? "Setting..." : "Set as Default"}
    </button>
  );
}
