"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useState, useEffect, useRef } from "react";

type Property = {
  property_id: string;
  property_name: string;
  property_type: string;
};

type Tenant = {
  user_id: string;
  user_name: string;
  user_email: string;
  phone_number?: string | null;
};

export default function LocalLeaseFilters({
  properties,
  activePropertyId,
  tenants,
  activeTenantId,
  includePrevious = true,
  unitNumber = "",
}: {
  properties: Property[];
  activePropertyId: string | null;
  tenants: Tenant[];
  activeTenantId: string | null;
  includePrevious?: boolean;
  unitNumber?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Combobox state
  const [query, setQuery] = useState("");
  const [unitInput, setUnitInput] = useState(unitNumber);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTenant = tenants.find((t) => t.user_id === activeTenantId);

  // Sync display query when activeTenantId changes
  useEffect(() => {
    if (selectedTenant) {
      const phoneStr = selectedTenant.phone_number ? ` | ${selectedTenant.phone_number}` : "";
      setQuery(`${selectedTenant.user_name}${phoneStr} | ${selectedTenant.user_email}`);
    } else {
      setQuery("");
    }
  }, [activeTenantId, selectedTenant]);

  // Sync unitInput prop
  useEffect(() => {
    setUnitInput(unitNumber);
  }, [unitNumber]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleIncludePreviousChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      const params = new URLSearchParams(searchParams.toString());
      if (!checked) {
        params.set("include_previous", "false");
      } else {
        params.delete("include_previous"); // Default is true
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleUnitSubmit = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val.trim()) {
        params.set("unit", val.trim());
      } else {
        params.delete("unit");
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const selectTenant = useCallback(
    (tenantId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tenantId) {
        params.set("tenant", tenantId);
      } else {
        params.delete("tenant");
      }
      setIsOpen(false);
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  // Filter tenants based on typing query (matches name, phone, or email)
  const filteredTenants = query.trim()
    ? tenants.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.user_name.toLowerCase().includes(q) ||
          t.user_email.toLowerCase().includes(q) ||
          (t.phone_number && t.phone_number.toLowerCase().includes(q))
        );
      })
    : tenants;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Filter Bar Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side Filters: Property & Unit Number */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Unit Number Search Input */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
              Unit No:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. A-12-03"
                value={unitInput}
                onChange={(e) => setUnitInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnitSubmit(unitInput);
                  }
                }}
                className="w-32 px-3 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-on-surface text-sm placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              />
              {unitInput && (
                <button
                  type="button"
                  onClick={() => {
                    setUnitInput("");
                    handleUnitSubmit("");
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Checkbox: Include Previous / Past Leases */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-on-surface hover:text-primary transition-colors bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-lg">
          <input
            type="checkbox"
            checked={includePrevious}
            onChange={handleIncludePreviousChange}
            disabled={isPending}
            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary accent-primary cursor-pointer"
          />
          <span>Include Previous / Past Leases</span>
        </label>
      </div>

      {/* Full-Row Typeable Tenant Filter Combobox */}
      <div className="relative w-full" ref={containerRef}>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant font-medium whitespace-nowrap hidden sm:inline">
            Tenant:
          </label>
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Type to search tenant by Name | Phone | Email..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-9 pr-9 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-on-surface text-sm placeholder:text-on-surface-variant/60 outline-none focus:border-primary transition-colors"
            />
            {activeTenantId || query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  selectTenant(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-variant"
                title="Clear Tenant Filter"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            ) : (
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
                expand_more
              </span>
            )}
          </div>
        </div>

        {/* Dropdown Options Popup */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-64 overflow-y-auto bg-surface-container-high border border-outline-variant/80 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 divide-y divide-outline-variant/30 animate-fade-in">
            <div
              onClick={() => {
                setQuery("");
                selectTenant(null);
              }}
              className="px-4 py-2.5 hover:bg-primary/20 cursor-pointer flex items-center justify-between text-sm transition-colors text-primary font-medium"
            >
              <span>All Tenants (Show All Leases)</span>
              {!activeTenantId && <span className="material-symbols-outlined text-[18px]">check</span>}
            </div>

            {filteredTenants.length === 0 ? (
              <div className="px-4 py-3 text-xs text-on-surface-variant text-center">
                No matching tenants found for "{query}"
              </div>
            ) : (
              filteredTenants.map((t) => {
                const isSelected = t.user_id === activeTenantId;
                return (
                  <div
                    key={t.user_id}
                    onClick={() => selectTenant(t.user_id)}
                    className={`px-4 py-2.5 hover:bg-surface-variant/70 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm transition-colors ${
                      isSelected ? "bg-primary/10 text-primary border-l-4 border-primary" : "text-on-surface"
                    }`}
                  >
                    {/* Full Row format: Name | Phone Number | Email */}
                    <div className="flex items-center gap-3 font-medium truncate">
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {t.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-on-surface">{t.user_name}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-on-surface-variant shrink-0">
                      <span className="font-mono bg-surface-container px-2 py-0.5 rounded border border-outline-variant/40 text-on-surface">
                        {t.phone_number || "No Phone"}
                      </span>
                      <span className="text-on-surface-variant/80 truncate max-w-[200px]">
                        {t.user_email}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {isPending && (
        <span className="material-symbols-outlined animate-spin-slow text-[20px] text-primary shrink-0">
          progress_activity
        </span>
      )}
    </div>
  );
}
