"use client";

import { useTransition, useEffect } from "react";
import { setActiveProperty } from "@/app/actions/property-actions";

type PropertyOption = {
  property_id: string;
  property_name: string;
};

export default function PropertySwitcher({
  properties,
  activePropertyId,
  isValid = true,
}: {
  properties: PropertyOption[];
  activePropertyId: string;
  isValid?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isValid && activePropertyId) {
      setActiveProperty(activePropertyId);
    }
  }, [isValid, activePropertyId]);

  if (properties.length === 0) return null;

  return (
    /*
      `min-w-0` on both the wrapper and the select is load-bearing (DEV-270).
      A <select> sizes itself to its longest OPTION, not to its container, so
      at 375px "Residensi Suasana Damai" pushed this wider than the top bar
      and the notification bell and the gear ended up drawn on top of it.
    */
    <div className="flex min-w-0 items-center gap-2">
      <span className="material-symbols-outlined text-on-surface-variant text-[20px] hidden sm:block">
        domain
      </span>
      <select
        className={`w-full min-w-0 truncate rounded-lg border border-outline-variant bg-surface-container-high px-3 py-1.5 text-sm font-medium text-on-surface outline-none transition-all focus:border-primary ${
          isPending ? "opacity-50 cursor-wait" : ""
        }`}
        value={activePropertyId}
        onChange={(e) => {
          startTransition(() => {
            setActiveProperty(e.target.value);
          });
        }}
        disabled={isPending}
      >
        {properties.map((p) => (
          <option key={p.property_id} value={p.property_id}>
            {p.property_name}
          </option>
        ))}
      </select>
    </div>
  );
}
