"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminEndLease } from "@/app/admin/leases/actions";
import { rowOpenProps } from "@/components/admin/rowLink";
import AdminLeaseFormModal from "./AdminLeaseFormModal";
import AdminLeaseEditModal from "./AdminLeaseEditModal";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { BTN, EmptyState, Money, SearchField, TABLE, Toolbar } from "@/components/admin/ui";
import { dayMonth } from "@/lib/short-date";

export interface LeaseItem {
  /** Billing history — decides whether this lease may be deleted or reassigned. */
  _count?: { invoices: number; lease_charges: number };
  lease_id: string;
  unit_id: string;
  user_id: string;
  move_in_date: any;
  move_out_date: any;
  status: string;
  billedMonthly?: number;
  chargeNames?: string[];
  owed?: number;
  unit: {
    unit_id: string;
    unit_number: string;
    unit_type?: string;
    property_id?: string;
    property?: { property_id: string; property_name: string };
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
  users: { user_id: string; user_name: string; user_email: string }[];
  activePropertyId?: string | null;
}

/** "10 months", "6 days" — how long this has been running. */
function runningFor(from: any, to: any) {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const days = Math.max(0, Math.floor((end - start) / 86_400_000));
  if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  return `${Math.floor(months / 12)} years`;
}

type ChipKey = "all" | "active" | "unbilled" | "ended";

/**
 * Tenancies (rebuilt DEV-265, to the batch-2 `Leases` and `LeaseEnd`
 * artboards).
 *
 * **"Bills nothing" is the point of this screen.** A tenancy with no
 * recurring charges is the most expensive silent failure in PropMate: the
 * monthly run skips it, the money never appears, and nobody learns until
 * somebody audits the arrears. It is on the row, it is a chip, and it is a
 * strip at the top that counts them — finding four across 206 tenancies by
 * eye is not a plan.
 *
 * The row's action is the one that matters: *Set its charges* when there are
 * none, *What it is billed* when there are. And ending a tenancy moved into
 * the menu, where the dialog can say what happens to the unpaid invoices
 * behind it.
 */
export default function LeasesClient({
  initialLeases,
  availableUnits,
  users,
}: LeasesClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [chip, setChip] = useState<ChipKey>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseItem | null>(null);
  const [ending, setEnding] = useState<LeaseItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const billsNothing = (l: LeaseItem) => l.status === "Active" && (l.billedMonthly ?? 0) <= 0;

  const matchesChip = (l: LeaseItem, k: ChipKey) => {
    switch (k) {
      case "all":
        return true;
      case "active":
        return l.status === "Active";
      case "unbilled":
        return billsNothing(l);
      case "ended":
        return l.status !== "Active";
    }
  };

  const counts: Record<ChipKey, number> = {
    all: initialLeases.length,
    active: initialLeases.filter((l) => matchesChip(l, "active")).length,
    unbilled: initialLeases.filter((l) => matchesChip(l, "unbilled")).length,
    ended: initialLeases.filter((l) => matchesChip(l, "ended")).length,
  };

  const CHIPS: { key: ChipKey; label: string; dot: string }[] = [
    { key: "all", label: "All", dot: "bg-slate-300" },
    { key: "active", label: "Active", dot: "bg-emerald-400" },
    { key: "unbilled", label: "Bills nothing", dot: "bg-amber-400" },
    { key: "ended", label: "Ended", dot: "bg-slate-500" },
  ];

  const rows = initialLeases.filter((l) => {
    if (!matchesChip(l, chip)) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.unit.unit_number.toLowerCase().includes(q) ||
      l.tenant.user_name.toLowerCase().includes(q) ||
      l.tenant.user_email.toLowerCase().includes(q)
    );
  });

  const unbilled = initialLeases.filter(billsNothing);

  const endLease = (l: LeaseItem) => {
    startTransition(async () => {
      /*
       * `adminEndLease`, not `adminDeleteLease` — the latter removes the row
       * and refuses the moment an invoice exists, which is correct for a
       * delete and wrong for an ending. Ending sets a move-out date, frees
       * the unit and leaves the arrears owed.
       */
      const res = await adminEndLease(l.lease_id);
      setEnding(null);
      if (res?.error) {
        setToast({ message: res.error, tone: "error" });
        return;
      }
      router.refresh();
      setToast({
        message: `The tenancy on ${l.unit.unit_number} has ended.`,
        detail:
          (l.owed ?? 0) > 0
            ? `RM ${(l.owed ?? 0).toLocaleString("en-MY", { minimumFractionDigits: 2 })} is still owed and still chaseable.`
            : undefined,
      });
    });
  };

  const menuFor = (l: LeaseItem): RowMenuItem[] => [
    { label: "Edit this tenancy", onSelect: () => setEditingLease(l) },
    ...(l.status === "Active"
      ? [{ label: "End this tenancy", onSelect: () => setEnding(l), danger: true }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {/* The warning only an invoice run discovers today. */}
      {unbilled.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3">
          <span className="material-symbols-outlined shrink-0 text-[20px] text-amber-300">error</span>
          <p className="min-w-[320px] flex-[999_1_320px] text-sm leading-relaxed">
            <span className="font-bold text-amber-200">
              {unbilled.length} tenanc{unbilled.length === 1 ? "y has" : "ies have"} no charges attached.
            </span>{" "}
            <span className="text-on-surface-variant">
              They bill nothing, and the monthly run skips them without saying so.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setChip("unbilled")}
            className="pressable inline-flex h-10 items-center rounded-xl bg-amber-400 px-4 text-sm font-bold text-[#241a02] transition-colors hover:bg-amber-300"
          >
            Show {unbilled.length === 1 ? "it" : `all ${unbilled.length}`}
          </button>
        </div>
      )}

      <nav aria-label="Filter tenancies" className="flex flex-wrap gap-2">
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
            Start a tenancy
          </button>
        }
      >
        <SearchField placeholder="Unit, resident or email" value={searchQuery} onChange={setSearchQuery} />
      </Toolbar>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
        <div className="border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-2.5 text-xs text-on-surface-variant">
          Showing <span className="font-semibold tabular-nums text-on-surface">{rows.length}</span> of{" "}
          <span className="tabular-nums">{initialLeases.length}</span>
        </div>

        {/* Cards below md. */}
        <div className="divide-y divide-outline-variant/30 md:hidden">
          {rows.length === 0 ? (
            <EmptyState
              icon="description"
              title="No tenancies match these filters"
              hint="Try another chip, or clear the search."
            />
          ) : (
            rows.map((l) => {
              const nothing = billsNothing(l);
              return (
                <div key={l.lease_id} className={`px-4 py-3.5 ${l.status !== "Active" ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <Link
                        href={`/admin/units/${l.unit.unit_id}`}
                        className="block text-sm font-bold text-white hover:text-primary"
                      >
                        {l.unit.unit_number}
                      </Link>
                      <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                        {l.tenant.user_name}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        l.status === "Active"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-outline-variant bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      {l.status === "Active" ? "Active" : "Ended"}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-on-surface-variant">
                    since {dayMonth(l.move_in_date, true)} · {runningFor(l.move_in_date, l.move_out_date)}
                  </p>

                  <div className="mt-2">
                    {nothing ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                        <span className="material-symbols-outlined text-[13px]">error</span>
                        Bills nothing
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-on-surface">
                        <Money value={l.billedMonthly ?? 0} /> a month
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/admin/leases/${l.lease_id}/charges`}
                    className={(nothing ? BTN.primary : BTN.secondary) + " mt-3 h-11 w-full justify-center"}
                  >
                    {nothing ? "Set its charges" : "What it is billed"}
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <div className={TABLE.wrap + " hidden md:block"}>
          <table className={TABLE.table + " min-w-[980px]"}>
            <caption className="sr-only">Tenancies</caption>
            <thead>
              <tr>
                <th className={TABLE.th}>Unit</th>
                <th className={TABLE.th}>Resident</th>
                <th className={TABLE.th}>Running since</th>
                <th className={TABLE.th}>Status</th>
                <th className={TABLE.th}>Billed each month</th>
                <th className={TABLE.thNum}>What happens next</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon="description"
                      title={
                        initialLeases.length === 0
                          ? "No tenancies yet"
                          : "No tenancies match these filters"
                      }
                      hint={
                        initialLeases.length === 0
                          ? "A tenancy joins a resident to a unit, and it is what gets billed. Nothing can be invoiced until one exists."
                          : "Try another chip, or clear the search."
                      }
                      action={
                        initialLeases.length === 0 ? (
                          <button type="button" onClick={() => setIsAddModalOpen(true)} className={BTN.primary}>
                            Start a tenancy
                          </button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map((l) => {
                  const nothing = billsNothing(l);
                  return (
                    <tr
                      key={l.lease_id}
                      /* The row opens the tenancy's charges — what it is billed
                         is the thing an admin opens a tenancy to see (DEV-280). */
                      {...rowOpenProps(
                        () => router.push(`/admin/leases/${l.lease_id}/charges`),
                        `Open the tenancy for ${l.unit?.unit_number ?? "this unit"}`
                      )}
                      className={
                        TABLE.tr +
                        " cursor-pointer" +
                        (nothing ? " bg-amber-500/[0.05]" : "") +
                        (l.status !== "Active" ? " opacity-65" : "")
                      }
                    >
                      <td className={TABLE.td + " align-top"}>
                        <Link
                          href={`/admin/units/${l.unit.unit_id}`}
                          className="whitespace-nowrap border-b border-primary/35 pb-px font-bold text-on-surface hover:text-primary"
                        >
                          {l.unit.unit_number}
                        </Link>
                      </td>

                      <td className={TABLE.tdMuted + " align-top"}>
                        <Link
                          href={`/admin/tenants?q=${encodeURIComponent(l.tenant.user_name)}`}
                          className="hover:text-primary hover:underline"
                        >
                          {l.tenant.user_name}
                        </Link>
                      </td>

                      <td className={TABLE.td + " align-top"}>
                        <span className="whitespace-nowrap tabular-nums text-on-surface-variant">
                          {dayMonth(l.move_in_date, true)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                          {l.status === "Active"
                            ? runningFor(l.move_in_date, null)
                            : `ended ${dayMonth(l.move_out_date ?? l.move_in_date, true)}`}
                        </span>
                      </td>

                      <td className={TABLE.td + " align-top"}>
                        <span
                          className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            l.status === "Active"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-outline-variant bg-surface-container-highest text-on-surface-variant"
                          }`}
                        >
                          {l.status === "Active" ? "Active" : "Ended"}
                        </span>
                      </td>

                      <td className={TABLE.td + " align-top"}>
                        {nothing ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/45 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                            <span className="material-symbols-outlined text-[13px]">error</span>
                            Bills nothing
                          </span>
                        ) : (
                          <>
                            <span className="whitespace-nowrap font-bold tabular-nums text-on-surface">
                              <Money value={l.billedMonthly ?? 0} />
                            </span>
                            <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                              {l.chargeNames && l.chargeNames.length > 0
                                ? l.chargeNames.join(" · ")
                                : "the unit's monthly rent"}
                            </span>
                          </>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        <span className="inline-flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/leases/${l.lease_id}/charges`}
                            className={
                              (nothing
                                ? "pressable inline-flex h-9 items-center rounded-xl bg-amber-400 px-3.5 text-xs font-bold text-[#241a02] transition-colors hover:bg-amber-300"
                                : BTN.secondary + " h-9 text-xs") + " whitespace-nowrap"
                            }
                          >
                            {nothing ? "Set its charges" : "What it is billed"}
                          </Link>
                          <RowMenu
                            label={`More actions for the tenancy on ${l.unit.unit_number}`}
                            items={menuFor(l)}
                          />
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Ending a tenancy says what happens to the money behind it. */}
      <ConfirmDialog
        open={!!ending}
        tone="danger"
        title={ending ? `End the tenancy on ${ending.unit.unit_number}?` : ""}
        body={
          ending
            ? (ending.owed ?? 0) > 0
              ? `${ending.tenant.user_name} stops being billed from today, and the unit becomes vacant. The RM ${(ending.owed ?? 0).toLocaleString(
                  "en-MY",
                  { minimumFractionDigits: 2 }
                )} already owed on ${
                  ending._count?.invoices ?? 0
                } invoice${(ending._count?.invoices ?? 0) === 1 ? "" : "s"} is not written off — it stays on the account and can still be chased.`
              : `${ending.tenant.user_name} stops being billed from today and the unit becomes vacant. Nothing is owed, so nothing is left behind.`
            : ""
        }
        confirmLabel="End it"
        cancelLabel="Keep it running"
        pending={isPending}
        onConfirm={() => ending && endLease(ending)}
        onClose={() => setEnding(null)}
      />

      <AdminLeaseFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        units={availableUnits}
        users={users}
      />

      <AdminLeaseEditModal
        lease={editingLease}
        isOpen={!!editingLease}
        onClose={() => setEditingLease(null)}
      />
    </div>
  );
}
