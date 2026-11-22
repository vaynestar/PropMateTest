"use client";

import { useState } from "react";
import Link from "next/link";
import TenantFormModal from "./TenantFormModal";
import TenantEditModal from "./TenantEditModal";
import TenantDeleteModal from "./TenantDeleteModal";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import { BTN, EmptyState, FIELD, Money, SearchField, TABLE, Toolbar } from "@/components/admin/ui";

interface Lease {
  lease_id: string;
  status?: string;
  unit: {
    unit_id: string;
    unit_number: string;
    property_id: string;
    property: { property_name: string };
  };
}

export interface TenantItem {
  user_id: string;
  user_name: string;
  user_email: string;
  phone_number: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  locked_until?: string | null;
  created_at?: string;
  owes?: number;
  tenant_leases: Lease[];
}

interface TenantsClientProps {
  initialTenants: TenantItem[];
  properties: { property_id: string; property_name: string }[];
  activePropertyId?: string | null;
}

/** How long ago, in the words somebody would actually use. */
function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

const monthYear = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";

type PortalKey = "never" | "locked" | "off" | "active";

/**
 * Residents (rebuilt DEV-264, to the batch-2 `Tenants` artboard).
 *
 * Four changes.
 *
 *   · **"No tenancy" is called out.** A resident with a login but no unit
 *     cannot be billed and cannot book anything. They looked identical to
 *     everyone else, and nobody found out until something failed.
 *   · **The row's action follows from that.** Somebody without a tenancy
 *     gets *Start a tenancy* as the primary; everyone else gets *Open their
 *     unit*.
 *   · **Portal status is a real column**, from a `last_login_at` the schema
 *     did not have until this increment. An account that has never been
 *     opened is the most common reason a resident says they were not told.
 *   · **Owes is a column and a filter.** The question an office brings to
 *     this screen could not be answered here at all.
 */
export default function TenantsClient({
  initialTenants,
  properties,
  activePropertyId,
}: TenantsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(activePropertyId ?? "ALL");
  const [chip, setChip] = useState<"all" | "notenancy" | "never" | "arrears">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantItem | null>(null);

  const activeLeaseOf = (t: TenantItem) =>
    t.tenant_leases.find((l) => l.status === "Active") ?? null;

  const portalOf = (t: TenantItem): { key: PortalKey; label: string } => {
    if (t.is_active === false) return { key: "off", label: "Account switched off" };
    if (t.locked_until && new Date(t.locked_until) > new Date())
      return { key: "locked", label: "Locked out" };
    if (!t.last_login_at) return { key: "never", label: "Never signed in" };
    return { key: "active", label: `Signed in ${ago(t.last_login_at)}` };
  };

  const PORTAL_PILL: Record<PortalKey, string> = {
    active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    never: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    locked: "border-amber-500/45 bg-amber-500/10 text-amber-200",
    off: "border-outline-variant bg-surface-container-highest text-on-surface-variant",
  };

  const matchesChip = (t: TenantItem, k: typeof chip) => {
    switch (k) {
      case "all":
        return true;
      case "notenancy":
        return !activeLeaseOf(t);
      case "never":
        return portalOf(t).key === "never";
      case "arrears":
        return (t.owes ?? 0) > 0;
    }
  };

  /*
   * A property filter is a standing scope, not an ad-hoc search, so the chip
   * counts respect it: "In arrears 34" above a table showing two rows is a
   * headline that contradicts the thing underneath it. The search box is
   * excluded, because a count that moved as you typed would be useless.
   */
  const inScope = initialTenants.filter((t) => {
    if (selectedPropertyId === "ALL") return true;
    const inProperty = t.tenant_leases.some((l) => l.unit?.property_id === selectedPropertyId);
    return inProperty || t.tenant_leases.length === 0;
  });

  const counts = {
    all: inScope.length,
    notenancy: inScope.filter((t) => matchesChip(t, "notenancy")).length,
    never: inScope.filter((t) => matchesChip(t, "never")).length,
    arrears: inScope.filter((t) => matchesChip(t, "arrears")).length,
  };

  const CHIPS: { key: typeof chip; label: string; dot: string }[] = [
    { key: "all", label: "Everyone", dot: "bg-slate-300" },
    { key: "notenancy", label: "No tenancy", dot: "bg-amber-400" },
    { key: "never", label: "Never signed in", dot: "bg-sky-400" },
    { key: "arrears", label: "In arrears", dot: "bg-rose-400" },
  ];

  const rows = initialTenants.filter((t) => {
    if (!matchesChip(t, chip)) return false;

    if (selectedPropertyId !== "ALL") {
      const inProperty = t.tenant_leases.some((l) => l.unit?.property_id === selectedPropertyId);
      // A resident with no tenancy at all belongs to no property, so a
      // property filter would hide exactly the people the "No tenancy" chip
      // exists to surface. Keep them visible.
      if (!inProperty && t.tenant_leases.length > 0) return false;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.user_name.toLowerCase().includes(q) ||
      t.user_email.toLowerCase().includes(q) ||
      (t.phone_number ?? "").toLowerCase().includes(q) ||
      t.tenant_leases.some((l) => l.unit?.unit_number?.toLowerCase().includes(q))
    );
  });

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

  const menuFor = (t: TenantItem): RowMenuItem[] => {
    const held = t.tenant_leases.length;
    return [
      { label: "Edit their details", onSelect: () => setEditingTenant(t) },
      { label: "See their tenancies", onSelect: () => {}, disabled: true, hint: "Use the button in the row" },
      {
        label: "Delete this account",
        onSelect: () => setDeletingTenant(t),
        danger: true,
        disabled: held > 0,
        hint:
          held > 0
            ? `They still hold ${held} tenanc${held === 1 ? "y" : "ies"}. End those first.`
            : undefined,
      },
    ];
  };

  return (
    <div className="space-y-5">
      <nav aria-label="Filter residents" className="flex flex-wrap gap-2">
        {CHIPS.map((c) => {
          const on = chip === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setChip(c.key)}
              className={`pressable inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-outline-variant/60 bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${c.dot}`} />
              {c.label}
              <span
                className={`rounded-full px-2 py-px text-[11px] font-bold tabular-nums ${
                  on ? "bg-primary/25 text-primary" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {counts[c.key]}
              </span>
            </button>
          );
        })}
      </nav>

      <Toolbar
        right={
          <button type="button" onClick={() => setIsAddModalOpen(true)} className={BTN.primary}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add a resident
          </button>
        }
      >
        <SearchField
          placeholder="Name, email, phone or unit"
          value={searchQuery}
          onChange={setSearchQuery}
        />
        {properties.length > 1 && (
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            aria-label="Filter by property"
            className={FIELD}
          >
            <option value="ALL">Every property</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>
        )}
      </Toolbar>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
        <div className="border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-2.5 text-xs text-on-surface-variant">
          Showing <span className="font-semibold tabular-nums text-on-surface">{rows.length}</span> of{" "}
          <span className="tabular-nums">{inScope.length}</span>
        </div>

        {/* Cards below md — six columns do not survive a phone. */}
        <div className="divide-y divide-outline-variant/30 md:hidden">
          {rows.length === 0 ? (
            <EmptyState
              icon="person_off"
              title="No residents match these filters"
              hint="Try another chip, or clear the search."
            />
          ) : (
            rows.map((t) => {
              const lease = activeLeaseOf(t);
              const portal = portalOf(t);
              const owes = t.owes ?? 0;
              return (
                <div key={t.user_id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white">{t.user_name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">
                        {t.user_email}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${PORTAL_PILL[portal.key]}`}
                    >
                      {portal.label}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    {lease ? (
                      <Link
                        href={`/admin/units/${lease.unit.unit_id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {lease.unit.unit_number}
                      </Link>
                    ) : (
                      <span className="rounded-full border border-amber-500/45 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-200">
                        No tenancy
                      </span>
                    )}
                    {owes > 0 && (
                      <span className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 font-bold text-rose-300">
                        <Money value={owes} /> owed
                      </span>
                    )}
                  </div>

                  <Link
                    href={
                      lease ? `/admin/units/${lease.unit.unit_id}` : `/admin/leases?tenant=${t.user_id}`
                    }
                    className={(lease ? BTN.secondary : BTN.primary) + " mt-3 h-11 w-full justify-center"}
                  >
                    {lease ? "Open their unit" : "Start a tenancy"}
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <div className={TABLE.wrap + " hidden md:block"}>
          <table className={TABLE.table + " min-w-[940px]"}>
            <caption className="sr-only">Residents</caption>
            <thead>
              <tr>
                <th className={TABLE.th}>Resident</th>
                <th className={TABLE.th}>Unit</th>
                <th className={TABLE.th}>Reaches them at</th>
                <th className={TABLE.th}>Portal</th>
                <th className={TABLE.thNum}>Owes</th>
                <th className={TABLE.thNum}>What happens next</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon="person_off"
                      title={
                        initialTenants.length === 0
                          ? "Nobody has a resident login yet"
                          : "No residents match these filters"
                      }
                      hint={
                        initialTenants.length === 0
                          ? "Add the person first, then start their tenancy — a resident reaches a unit only through a lease."
                          : "Try another chip, or clear the search."
                      }
                      action={
                        initialTenants.length === 0 ? (
                          <button type="button" onClick={() => setIsAddModalOpen(true)} className={BTN.primary}>
                            Add a resident
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map((t) => {
                  const lease = activeLeaseOf(t);
                  const portal = portalOf(t);
                  const owes = t.owes ?? 0;
                  return (
                    <tr key={t.user_id} className={TABLE.tr}>
                      <td className={TABLE.td + " align-top"}>
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-[11px] font-extrabold text-on-surface-variant">
                            {initials(t.user_name)}
                          </span>
                          <span className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setEditingTenant(t)}
                              className="block w-fit border-b border-primary/35 pb-px font-bold text-on-surface hover:text-primary"
                            >
                              {t.user_name}
                            </button>
                            <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                              {lease
                                ? `resident since ${monthYear(t.created_at)}`
                                : `added ${monthYear(t.created_at)}`}
                            </span>
                          </span>
                        </span>
                      </td>

                      <td className={TABLE.td + " align-top"}>
                        {lease ? (
                          <Link
                            href={`/admin/units/${lease.unit.unit_id}`}
                            className="whitespace-nowrap border-b border-primary/35 pb-px font-semibold text-on-surface hover:text-primary"
                          >
                            {lease.unit.unit_number}
                          </Link>
                        ) : (
                          <span className="whitespace-nowrap rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                            No tenancy
                          </span>
                        )}
                      </td>

                      <td className={TABLE.tdMuted + " align-top"}>
                        <span className="block truncate">{t.user_email}</span>
                        <span className="mt-0.5 block text-[11px] tabular-nums text-on-surface-variant">
                          {t.phone_number ?? "no phone on file"}
                        </span>
                      </td>

                      <td className={TABLE.td + " align-top"}>
                        <span
                          className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${PORTAL_PILL[portal.key]}`}
                        >
                          {portal.label}
                        </span>
                      </td>

                      <td className={TABLE.tdNum + " whitespace-nowrap align-top"}>
                        {owes > 0 ? (
                          <Link href="/admin/billing/arrears" className="font-bold text-rose-300 hover:underline">
                            <Money value={owes} />
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant/50">—</span>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        <span className="inline-flex items-center justify-end gap-2">
                          <Link
                            href={
                              lease
                                ? `/admin/units/${lease.unit.unit_id}`
                                : `/admin/leases?tenant=${t.user_id}`
                            }
                            className={(lease ? BTN.secondary : BTN.primary) + " h-9 whitespace-nowrap text-xs"}
                          >
                            {lease ? "Open their unit" : "Start a tenancy"}
                          </Link>
                          <RowMenu label={`More actions for ${t.user_name}`} items={menuFor(t)} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TenantFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

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
