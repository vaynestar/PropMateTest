"use client";

import { useState, useMemo, useActionState, useEffect } from "react";
import { adminDeleteLease } from "@/app/admin/leases/actions";
import Link from "next/link";
import AdminLeaseFormModal from "./AdminLeaseFormModal";
import AdminLeaseEditModal from "./AdminLeaseEditModal";

export interface LeaseItem {
  /** Billing history — decides whether this lease may be deleted or reassigned. */
  _count?: { invoices: number; lease_charges: number };
  lease_id: string;
  unit_id: string;
  user_id: string;
  move_in_date: any;
  move_out_date: any;
  status: string;
  unit: {
    unit_id: string;
    unit_number: string;
    unit_type?: string;
    property_id?: string;
    property?: {
      property_id: string;
      property_name: string;
    };
  };
  tenant: {
    user_id: string;
    user_name: string;
    user_email: string;
    phone_number: string | null;
  };
}

interface LeasesClientProps {
  initialLeases: LeaseItem[];
  properties: { property_id: string; property_name: string }[];
  availableUnits: {
    unit_id: string;
    unit_number: string;
    status: string;
    property?: { property_name: string };
  }[];
  users: {
    user_id: string;
    user_name: string;
    user_email: string;
  }[];
  activePropertyId?: string | null;
}

export default function LeasesClient({
  initialLeases,
  properties,
  availableUnits,
  users,
  activePropertyId: initialActiveProp,
}: LeasesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [includePrevious, setIncludePrevious] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseItem | null>(null);
  const [deletingLease, setDeletingLease] = useState<LeaseItem | null>(null);

  // Filtered leases
  const filteredLeases = useMemo(() => {
    return initialLeases.filter((lease) => {
      const matchesProp =
        true; // the server already scoped this list to the active property

      const matchesStatus = includePrevious || lease.status === "Active";

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lease.unit.unit_number.toLowerCase().includes(q) ||
        lease.tenant.user_name.toLowerCase().includes(q) ||
        lease.tenant.user_email.toLowerCase().includes(q) ||
        (lease.tenant.phone_number && lease.tenant.phone_number.toLowerCase().includes(q));

      return matchesProp && matchesStatus && matchesSearch;
    });
  }, [initialLeases, includePrevious, searchQuery]);

  // Aggregate KPIs
  const totalLeases = initialLeases.length;
  const activeLeasesCount = initialLeases.filter((l) => l.status === "Active").length;
  const inactiveLeasesCount = totalLeases - activeLeasesCount;
  const propertiesCount = properties.length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Leases
            </span>
            <div className="text-2xl font-bold text-white mt-1">{totalLeases}</div>
            <span className="text-[11px] text-on-surface-variant">on record</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">description</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Active
            </span>
            <div className="text-2xl font-bold text-white mt-1">{activeLeasesCount}</div>
            <span className="text-[11px] text-emerald-400">someone living there</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Ended
            </span>
            <div className="text-2xl font-bold text-white mt-1">{inactiveLeasesCount}</div>
            <span className="text-[11px] text-on-surface-variant">moved out</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">history</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-on-surface-variant">
              Properties
            </span>
            <div className="text-2xl font-bold text-white mt-1">{propertiesCount}</div>
            <span className="text-[11px] text-on-surface-variant">with a lease</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-[24px]">apartment</span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Property Select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenant, unit or email"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant/60 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Status Toggle & Add Button */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface-variant select-none">
            <input
              type="checkbox"
              checked={includePrevious}
              onChange={(e) => setIncludePrevious(e.target.checked)}
              className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 bg-surface-container-high"
            />
            <span>Include Inactive Leases</span>
          </label>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Lease</span>
          </button>
        </div>
      </div>

      {/* Leases Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLeases.map((lease) => {
          const isActive = lease.status === "Active";
          const invoiceCount = lease._count?.invoices ?? 0;
          const chargeCount = lease._count?.lease_charges ?? 0;
          // A lease that has billed anything is a financial record: it can be
          // ended, but never deleted or repointed at a different unit/tenant.
          const billingLocked = invoiceCount > 0 || chargeCount > 0;
          const lockReason =
            invoiceCount > 0
              ? `${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"} raised — end the lease instead of deleting it`
              : chargeCount > 0
              ? `${chargeCount} recurring charge${chargeCount === 1 ? "" : "s"} set up — remove them first`
              : undefined;
          const moveInStr = lease.move_in_date
            ? new Date(lease.move_in_date).toLocaleDateString()
            : "N/A";
          const moveOutStr = lease.move_out_date
            ? new Date(lease.move_out_date).toLocaleDateString()
            : "—";

          return (
            <div
              key={lease.lease_id}
              className={`p-5 rounded-2xl bg-surface-container border transition-all flex flex-col justify-between gap-4 group ${
                isActive
                  ? "border-outline-variant/60 hover:border-primary/50"
                  : "border-outline-variant/30 opacity-75 hover:opacity-100"
              }`}
            >
              <div>
                {/* Top Row: Unit # & Status Pill */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">meeting_room</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                        Unit {lease.unit.unit_number}
                      </h3>
                      <span className="text-[11px] text-on-surface-variant font-medium block truncate">
                        {lease.unit.property?.property_name || "Strata Development"}
                      </span>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/60 text-on-surface-variant text-[10px] font-medium shrink-0">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Tenant Row */}
                <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/40 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate">{lease.tenant.user_name}</span>
                    <span className="text-[10px] font-semibold text-primary">Tenant</span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant truncate">
                    {lease.tenant.user_email}
                  </div>
                  {lease.tenant.phone_number && (
                    <div className="text-[11px] text-on-surface-variant/80">
                      {lease.tenant.phone_number}
                    </div>
                  )}
                </div>

                {/* Tenancy Dates */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline-variant/30 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-emerald-400">login</span>
                      Move-In
                    </span>
                    <span className="font-semibold text-white">{moveInStr}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-amber-400">logout</span>
                      Move-Out
                    </span>
                    <span className="font-semibold text-white">{moveOutStr}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                <Link
                  href={`/admin/leases/${lease.lease_id}/charges`}
                  className="flex-1 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs pressable"
                >
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                  <span>Charges & Billing</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setEditingLease(lease)}
                  className="pressable flex items-center justify-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingLease(lease)}
                  disabled={billingLocked}
                  title={lockReason}
                  className="pressable flex items-center justify-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:border-outline-variant/40 disabled:bg-surface-container disabled:text-on-surface-variant/50 disabled:hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredLeases.length === 0 && (
          <div className="col-span-full py-16 text-center rounded-2xl bg-surface-container border border-outline-variant/40 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px] opacity-40">description</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No leases yet</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {searchQuery
                  ? "Try a different tenant, unit or email."
                  : "A lease is what connects a tenant to a unit. Create one to fill a vacant unit."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AdminLeaseFormModal
        units={availableUnits}
        users={users}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <AdminLeaseEditModal
        lease={editingLease}
        isOpen={!!editingLease}
        onClose={() => setEditingLease(null)}
      />

      <DeleteLeaseDialog lease={deletingLease} onClose={() => setDeletingLease(null)} />
    </div>
  );
}


/**
 * Deleting is only offered for a lease that never billed anything, so this is a
 * plain confirmation rather than a warning wall. The server re-checks the same
 * rule — the disabled button is a courtesy, not the guard.
 */
function DeleteLeaseDialog({
  lease,
  onClose,
}: {
  lease: LeaseItem | null;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(adminDeleteLease, null);

  useEffect(() => {
    if (state?.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!lease) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant/80 bg-surface-container shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant/40 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Delete this lease?</h2>
            <p className="text-xs text-on-surface-variant">
              {lease.unit?.unit_number} — {lease.tenant?.user_name}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-6">
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Nothing has been billed against this lease, so it can be removed as if it were never
            created. {lease.unit?.unit_number} goes back to <strong className="text-sky-300">Vacant</strong>.
          </p>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            If the tenant actually lived here, set a move-out date under Edit instead — that keeps
            the record.
          </p>
          {state?.error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {state.error}
            </p>
          )}
        </div>

        <form
          action={formAction}
          className="flex items-center justify-end gap-3 border-t border-outline-variant/40 bg-surface-container-high/40 px-6 py-4"
        >
          <input type="hidden" name="lease_id" value={lease.lease_id} />
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="pressable rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:text-white"
          >
            Keep it
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="pressable flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-5 py-2 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
          >
            {isPending && (
              <span className="material-symbols-outlined animate-spin-slow text-[15px]">
                progress_activity
              </span>
            )}
            Delete lease
          </button>
        </form>
      </div>
    </div>
  );
}
