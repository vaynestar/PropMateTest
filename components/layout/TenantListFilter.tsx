"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import TenantEditForm from "@/app/admin/tenants/TenantEditForm";
import TenantDeleteForm from "@/app/admin/tenants/TenantDeleteForm";

type Property = {
  property_id: string;
  property_name: string;
};

type Lease = {
  lease_id: string;
  unit: {
    property_id: string;
    property: {
      property_name: string;
    };
  };
};

type Tenant = {
  user_id: string;
  user_name: string;
  user_email: string;
  phone_number: string | null;
  tenant_leases: Lease[];
};

export default function TenantListFilter({
  tenants,
  properties,
}: {
  tenants: Tenant[];
  properties: Property[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const selectedPropertyName = useMemo(() => {
    return properties.find((p) => p.property_id === selectedPropertyId)?.property_name || "";
  }, [properties, selectedPropertyId]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // 1. Text Search Filter (Name, Email, Phone)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tenant.user_name.toLowerCase().includes(q) ||
        tenant.user_email.toLowerCase().includes(q) ||
        (tenant.phone_number && tenant.phone_number.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // 2. Property Filter
      if (selectedPropertyId) {
        // Tenant must have at least 1 lease in the selected property
        const hasLeaseInProperty = tenant.tenant_leases.some(
          (l) => l.unit.property_id === selectedPropertyId
        );
        if (!hasLeaseInProperty) return false;
      }

      return true;
    });
  }, [tenants, searchQuery, selectedPropertyId]);

  return (
    <div className="glass-card rounded-xl p-0 overflow-hidden">
      {/* Header & Filter Controls Bar */}
      <div className="p-6 border-b border-outline-variant/30 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Registered Tenants
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface px-2.5 py-1 rounded-md border border-outline-variant/40">
            {filteredTenants.length} of {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Filter Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-7 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter by Name, Phone, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-on-surface text-sm placeholder:text-on-surface-variant/60 outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 rounded-full"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Property Dropdown Filter */}
          <div className="sm:col-span-5 flex items-center gap-2">
            <label className="text-xs text-on-surface-variant font-medium whitespace-nowrap hidden sm:inline">
              Property:
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full bg-surface-container-high border border-outline-variant px-3 py-2 rounded-lg text-on-surface text-sm outline-none focus:border-primary transition-colors"
            >
              <option value="">All Properties (All Leases)</option>
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>
                  {p.property_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tenants Grid Output */}
      <div className="p-6">
        {filteredTenants.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
            No tenants found matching your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => {
              // Calculate dynamic lease count based on property filter
              const propertyLeases = selectedPropertyId
                ? tenant.tenant_leases.filter((l) => l.unit.property_id === selectedPropertyId)
                : tenant.tenant_leases;

              const leaseCount = propertyLeases.length;

              return (
                <div
                  key={tenant.user_id}
                  className="bg-surface-container border border-outline-variant/50 rounded-xl p-5 shadow-lg flex flex-col hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                        {tenant.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-on-surface truncate max-w-[180px]" title={tenant.user_name}>
                          {tenant.user_name}
                        </h3>
                        <p className="text-xs text-on-surface-variant truncate max-w-[180px]" title={tenant.user_email}>
                          {tenant.user_email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-on-surface-variant flex-grow mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">phone</span>
                      <span className="font-mono">{tenant.phone_number || "No phone number"}</span>
                    </div>

                    {/* Dynamic Property Lease Count */}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">real_estate_agent</span>
                      {selectedPropertyId ? (
                        <span className="text-on-surface font-medium">
                          {leaseCount} Lease{leaseCount === 1 ? "" : "s"} in <strong className="text-primary">{selectedPropertyName}</strong>
                        </span>
                      ) : (
                        <span>
                          {leaseCount} Active/Past Lease{leaseCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant/30">
                    <Link
                      href={`/admin/leases?tenant=${tenant.user_id}${selectedPropertyId ? `&property=${selectedPropertyId}` : ""}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium pressable"
                      title="View Leases for this Tenant"
                    >
                      <span className="material-symbols-outlined text-[18px]">real_estate_agent</span>
                      View Leases
                    </Link>
                    <TenantEditForm tenant={tenant} />
                    <TenantDeleteForm userId={tenant.user_id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
