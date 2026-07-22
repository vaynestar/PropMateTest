"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

type Property = {
  property_id: string;
  property_name: string;
  property_type: string;
};

type Tenant = {
  user_id: string;
  user_name: string;
  user_email: string;
};

export default function LocalLeaseFilters({
  properties,
  activePropertyId,
  tenants,
  activeTenantId,
}: {
  properties: Property[];
  activePropertyId: string | null;
  tenants: Tenant[];
  activeTenantId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePropertyChange = useCallback(
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

  const handleTenantChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set("tenant", val);
      } else {
        params.delete("tenant");
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
      {/* Property Filter */}
      {properties.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
            Property:
          </label>
          <select
            value={activePropertyId || ""}
            onChange={handlePropertyChange}
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
        </div>
      )}

      {/* Tenant Filter */}
      {tenants.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
            Tenant:
          </label>
          <select
            value={activeTenantId || ""}
            onChange={handleTenantChange}
            disabled={isPending}
            className="rounded-lg bg-surface-container-high border border-outline-variant px-3 py-1.5 text-on-surface text-sm outline-none focus:border-primary disabled:opacity-50 min-w-[160px]"
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.user_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isPending && (
        <span className="material-symbols-outlined animate-spin-slow text-[18px] text-primary">
          progress_activity
        </span>
      )}
    </div>
  );
}
