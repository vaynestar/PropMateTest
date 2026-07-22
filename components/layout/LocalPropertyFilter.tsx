"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Property = {
  property_id: string;
  property_name: string;
  property_type: string;
};

export default function LocalPropertyFilter({
  properties,
  activePropertyId,
}: {
  properties: Property[];
  activePropertyId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set("property", val);
      } else {
        params.delete("property");
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  if (properties.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-on-surface-variant font-medium whitespace-nowrap">
        Filter by Property:
      </label>
      <select
        value={activePropertyId || ""}
        onChange={handleChange}
        className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface text-sm outline-none focus:border-primary"
      >
        <option value="">All Properties</option>
        {properties.map((p) => (
          <option key={p.property_id} value={p.property_id}>
            {p.property_name} ({p.property_type})
          </option>
        ))}
      </select>
    </div>
  );
}
