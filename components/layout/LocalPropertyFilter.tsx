"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set("property", val);
      } else {
        params.delete("property");
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  if (properties.length === 0) return null;

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <label className="text-sm text-on-surface-variant font-medium whitespace-nowrap">
        Filter by Property:
      </label>
      <div className="relative">
        <select
          value={activePropertyId || ""}
          onChange={handleChange}
          disabled={isPending}
          className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface text-sm outline-none focus:border-primary disabled:opacity-50"
        >
          <option value="">All Properties</option>
          {properties.map((p) => (
            <option key={p.property_id} value={p.property_id}>
              {p.property_name} ({p.property_type})
            </option>
          ))}
        </select>
        {isPending && (
          <div className="absolute right-[-24px] top-1/2 -translate-y-1/2 text-primary">
            <span className="material-symbols-outlined animate-spin-slow text-[18px]">progress_activity</span>
          </div>
        )}
      </div>
    </div>
  );
}
