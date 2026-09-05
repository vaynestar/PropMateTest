"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import TenantFormModal from "./TenantFormModal";
import TenantEditModal from "./TenantEditModal";
import TenantDeleteModal from "./TenantDeleteModal";

interface Lease {
  lease_id: string;
  status?: string;
  unit: {
    unit_id: string;
    unit_number: string;
    property_id: string;
    property: {
      property_name: string;
    };
  };
}

export interface TenantItem {
  user_id: string;
  user_name: string;
  user_email: string;
  phone_number: string | null;
  tenant_leases: Lease[];
}

interface TenantsClientProps {
  initialTenants: TenantItem[];
  properties: { property_id: string; property_name: string }[];
  activePropertyId?: string | null;
}

export default function TenantsClient({
  initialTenants,
  properties,
  activePropertyId,
}: TenantsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(activePropertyId ?? "ALL");
  const [leaseFilter, setLeaseFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return initialTenants.filter((tenant) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tenant.user_name.toLowerCase().includes(q) ||
        tenant.user_email.toLowerCase().includes(q) ||
        (tenant.phone_number && tenant.phone_number.toLowerCase().includes(q));

      // A tenant with no lease belongs to no property yet, so a property filter
      // would hide them — including the one you just created. They always show.
      const matchesProperty =
        selectedPropertyId === "ALL" ||
        tenant.tenant_leases.length === 0 ||
        tenant.tenant_leases.some((l) => l.unit.property_id === selectedPropertyId);

      const hasActiveLease = tenant.tenant_leases.length > 0;
      const matchesLease =
        leaseFilter === "ALL" ||
        (leaseFilter === "LEASED" && hasActiveLease) ||
        (leaseFilter === "UNASSIGNED" && !hasActiveLease);

      return matchesSearch && matchesProperty && matchesLease;
    });
  }, [initialTenants, searchQuery, selectedPropertyId, leaseFilter]);

  // Aggregate KPIs
  const totalTenants = initialTenants.length;
  const activeLeaseholders = initialTenants.filter((t) => t.tenant_leases.length > 0).length;
  const unassignedTenants = totalTenants - activeLeaseholders;
  const propertiesCovered = properties.length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Tenants
            </span>
            <div className="text-2xl font-bold text-white mt-1">{totalTenants}</div>
            <span className="text-[11px] text-on-surface-variant">with a login</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">groups</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Renting now
            </span>
            <div className="text-2xl font-bold text-white mt-1">{activeLeaseholders}</div>
            <span className="text-[11px] text-emerald-400">have a unit</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[24px]">home_pin</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              No unit yet
            </span>
            <div className="text-2xl font-bold text-white mt-1">{unassignedTenants}</div>
            <span className="text-[11px] text-on-surface-variant">needs a lease</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-[24px]">person_outline</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Properties
            </span>
            <div className="text-2xl font-bold text-white mt-1">{propertiesCovered}</div>
            <span className="text-[11px] text-on-surface-variant">they live across</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-[24px]">apartment</span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Property Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant/60 text-xs text-white outline-none focus:border-primary shrink-0"
          >
            <option value="ALL">All properties</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email or phone"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant/60 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Lease Status Pills & Add Button */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 bg-surface-container-high/60 p-1 rounded-xl border border-outline-variant/40">
            {[
              { id: "ALL", label: "All" },
              { id: "LEASED", label: "Renting" },
              { id: "UNASSIGNED", label: "No unit" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLeaseFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  leaseFilter === f.id
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Tenant</span>
          </button>
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTenants.map((tenant) => {
          const hasLease = tenant.tenant_leases.length > 0;
          const leaseCount = tenant.tenant_leases.length;

          return (
            <div
              key={tenant.user_id}
              className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 hover:border-primary/50 transition-all flex flex-col justify-between gap-4 group"
            >
              <div>
                {/* Header: Avatar + Name + Status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-primary font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      {tenant.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                        {tenant.user_name}
                      </h3>
                      <span className="text-[10px] font-semibold text-on-surface-variant">
                        Resident
                      </span>
                    </div>
                  </div>

                  {hasLease ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                      Renting
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/60 text-on-surface-variant text-[10px] font-medium shrink-0">
                      No unit
                    </span>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-1.5 text-xs text-on-surface-variant border-b border-outline-variant/30 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0">mail</span>
                    <span className="truncate">{tenant.user_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0">call</span>
                    <span>{tenant.phone_number || "No phone number registered"}</span>
                  </div>
                </div>

                {/* Assigned Units Pill List */}
                <div className="pt-3">
                  <span className="text-[10px] font-semibold text-on-surface-variant block mb-1.5">
                    Units
                  </span>
                  {hasLease ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tenant.tenant_leases.map((l) => (
                        <Link
                          key={l.lease_id}
                          href={`/admin/leases?tenant=${tenant.user_id}`}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-variant border border-outline-variant/40 text-xs font-semibold text-white flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[13px] text-cyan-400">meeting_room</span>
                          <span>{l.unit.unit_number}</span>
                          <span className="text-[10px] text-on-surface-variant">({l.unit.property.property_name})</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant/70 italic">No active unit leases assigned</span>
                  )}
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                <Link
                  href={`/admin/leases?tenant=${tenant.user_id}`}
                  className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90"
                >
                  <span>{leaseCount === 0 ? "Create lease" : "View leases"}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setEditingTenant(tenant)}
                  className="pressable flex items-center justify-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingTenant(tenant)}
                  disabled={leaseCount > 0}
                  title={
                    leaseCount > 0
                      ? `${tenant.user_name} still holds ${leaseCount} lease${leaseCount === 1 ? "" : "s"}. End them before deleting the account.`
                      : undefined
                  }
                  className="pressable flex items-center justify-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:border-outline-variant/40 disabled:bg-surface-container disabled:text-on-surface-variant/50 disabled:hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredTenants.length === 0 && (
          <div className="col-span-full py-16 text-center rounded-2xl bg-surface-container border border-outline-variant/40 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px] opacity-40">person_off</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No Residents Found</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {searchQuery || selectedPropertyId !== "ALL" || leaseFilter !== "ALL"
                  ? "No resident accounts match your filter criteria."
                  : "Start onboarding residents by registering their accounts."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TenantFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <TenantEditModal
        tenant={editingTenant}
        isOpen={!!editingTenant}
        onClose={() => setEditingTenant(null)}
      />

      <TenantDeleteModal
        tenant={deletingTenant}
        isOpen={!!deletingTenant}
        onClose={() => setDeletingTenant(null)}
      />
    </div>
  );
}
