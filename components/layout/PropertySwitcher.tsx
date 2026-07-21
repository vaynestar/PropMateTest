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
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-on-surface-variant text-[20px] hidden sm:block">
        domain
      </span>
      <select
        className={`bg-surface-container-high text-on-surface border border-outline-variant rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-primary transition-all ${
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
