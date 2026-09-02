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
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-xs">
        <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </span>
        <span>Default</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          setActiveProperty(propertyId);
        });
      }}
      disabled={isPending}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/60 hover:border-amber-500/50 text-on-surface-variant hover:text-amber-300 transition-all text-xs font-medium pressable disabled:opacity-50"
      title="Set as active operational default"
    >
      {isPending ? (
        <span className="material-symbols-outlined animate-spin-slow text-[15px]">progress_activity</span>
      ) : (
        <span className="material-symbols-outlined text-[15px]">star_border</span>
      )}
      <span>{isPending ? "Setting..." : "Set Default"}</span>
    </button>
  );
}
