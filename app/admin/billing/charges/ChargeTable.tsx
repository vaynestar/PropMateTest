"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { EmptyState, TABLE } from "@/components/admin/ui";
import { toggleChargeActiveAction } from "./actions";
import EditChargeModal from "./EditChargeModal";
import { chargeType, RENT_CHARGE_NAME } from "@/lib/charge-type";

/**
 * The charge catalogue (rebuilt DEV-258, to the batch-1 `ChargeTypes`
 * artboard).
 *
 * Three changes.
 *
 *   · **"On leases" is a new column.** A charge nobody uses and a charge on
 *     every lease looked identical, and switching the second one off is a
 *     very different act. The count links to the leases billing it.
 *   · **Retired, not Inactive.** The status pill said Active or Inactive —
 *     database words for a thing with a plain meaning. A charge type that has
 *     reached an invoice cannot be deleted without rewriting history, so it
 *     retires: it stops being offered, the row dims, and old invoices still
 *     read correctly. The toggle moved into the row menu and now asks first,
 *     because the warning it produced afterwards ("4 leases are still billing
 *     it") is the kind of thing you want before you click, not after.
 *   · **One named action per row**, Edit, with the rest in words behind `⋯`.
 */
export default function ChargeTable({ charges }: { charges: any[] }) {
  const [editingCharge, setEditingCharge] = useState<any | null>(null);
  const [confirming, setConfirming] = useState<any | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (charge: any) => {
    setPendingId(charge.charge_id);
    const formData = new FormData();
    formData.append("charge_id", charge.charge_id);
    formData.append("current_active", charge.is_active ? "true" : "false");

    startTransition(async () => {
      const result: any = await toggleChargeActiveAction(formData);
      setPendingId(null);
      setConfirming(null);
      if (result?.error) {
        setToast({ message: result.error, tone: "error" });
        return;
      }
      setToast({
        message: charge.is_active
          ? `${charge.charge_name} is retired.`
          : `${charge.charge_name} is back in the catalogue.`,
        // Switching a charge off does not touch the leases already billing
        // it. Saying so beats letting the admin assume the money stopped.
        detail:
          charge.is_active && result?.inUse > 0
            ? `${result.inUse} ${result.inUse === 1 ? "lease is" : "leases are"} still billing it. Remove it from those leases to actually stop it.`
            : undefined,
      });
    });
  };

  const menuFor = (c: any): RowMenuItem[] => {
    const locked = c.charge_name === RENT_CHARGE_NAME;
    return [
      { label: "Edit this charge", onSelect: () => setEditingCharge(c) },
      ...(c.leaseCount > 0
        ? [{ label: `See the ${c.leaseCount} lease${c.leaseCount === 1 ? "" : "s"} billing it`, onSelect: () => {}, disabled: true, hint: "Open from the count in the row" }]
        : []),
      c.is_active
        ? {
            label: "Retire it",
            onSelect: () => setConfirming(c),
            danger: true,
            disabled: locked,
            hint: locked ? "Invoice generation finds the rent line by name" : undefined,
          }
        : { label: "Bring it back", onSelect: () => toggle(c) },
    ];
  };

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container lg:col-span-2">
        <div className="border-b border-outline-variant/40 bg-surface-container-high/40 px-4 py-2.5 text-xs text-on-surface-variant">
          <span className="font-semibold tabular-nums text-on-surface">{charges.length}</span> charge
          {charges.length === 1 ? "" : " types"}
          {charges.some((c) => !c.is_active) && (
            <>
              {" · "}
              {charges.filter((c) => !c.is_active).length} retired
            </>
          )}
        </div>

        <div className={TABLE.wrap}>
          <table className={TABLE.table}>
            <caption className="sr-only">Charge types</caption>
            <thead>
              <tr>
                <th className={TABLE.th}>Charge</th>
                <th className={TABLE.th}>Kind</th>
                <th className={TABLE.th}>Per</th>
                <th className={TABLE.thNum}>Default</th>
                <th className={TABLE.thNum}>On leases</th>
                <th className={TABLE.thNum}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {charges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon="sell"
                      title="Nothing can be billed yet"
                      hint="Add the first charge type beside this list — service charge and sinking fund are the usual two."
                    />
                  </td>
                </tr>
              ) : (
                charges.map((c) => {
                  const busy = pendingId === c.charge_id;
                  const t = chargeType(c.charge_type);
                  return (
                    <tr
                      key={c.charge_id}
                      className={TABLE.tr + (c.is_active ? "" : " opacity-60") + (busy ? " opacity-40" : "")}
                    >
                      <td className={TABLE.td + " align-top"}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{c.charge_name}</span>
                          {!c.is_active && (
                            <span className="rounded-full border border-outline-variant bg-surface-container-highest px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                              Retired
                            </span>
                          )}
                          {c.charge_name === RENT_CHARGE_NAME && (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-outline-variant/60 bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant"
                              title="Invoice generation finds the rent line by this name, so it cannot be renamed or retired."
                            >
                              <span className="material-symbols-outlined text-[11px] leading-none">lock</span>
                              System
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <div className="mt-0.5 max-w-xs truncate text-[11px] text-on-surface-variant">
                            {c.description}
                          </div>
                        )}
                      </td>

                      <td className={TABLE.td + " align-top"}>
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${t.badge}`}
                          title={t.hint}
                        >
                          <span className="material-symbols-outlined text-[13px] leading-none">{t.icon}</span>
                          {t.label}
                        </span>
                      </td>

                      <td className={TABLE.tdMuted + " whitespace-nowrap align-top"}>{c.uom}</td>

                      <td className={TABLE.tdNum + " whitespace-nowrap align-top font-semibold"}>
                        {Number(c.default_amount) === 0 ? (
                          <span
                            className="text-on-surface-variant"
                            title="No default. The amount is set per lease when this charge is added."
                          >
                            Set per lease
                          </span>
                        ) : (
                          `RM ${Number(c.default_amount).toFixed(2)}`
                        )}
                      </td>

                      <td className={TABLE.tdNum + " whitespace-nowrap align-top"}>
                        {c.leaseCount > 0 ? (
                          <Link
                            href={`/admin/billing/recurring-charges?charge=${c.charge_id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {c.leaseCount} lease{c.leaseCount === 1 ? "" : "s"}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant/50">none</span>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        <span className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCharge(c)}
                            className="pressable inline-flex h-8 items-center rounded-lg border border-outline-variant/60 bg-surface-container-high px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
                          >
                            Edit
                          </button>
                          <RowMenu label={`More for ${c.charge_name}`} items={menuFor(c)} />
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

      <ConfirmDialog
        open={!!confirming}
        tone="danger"
        title={confirming ? `Retire ${confirming.charge_name}?` : ""}
        body={
          confirming
            ? confirming.leaseCount > 0
              ? `It stops being offered when adding charges, but ${confirming.leaseCount} lease${
                  confirming.leaseCount === 1 ? "" : "s"
                } already billing it will keep billing it. Remove it from those leases to actually stop the money.`
              : confirming.invoicedCount > 0
              ? `It stops being offered when adding charges. The ${confirming.invoicedCount} invoice line${
                  confirming.invoicedCount === 1 ? "" : "s"
                } already raised against it are untouched and still read correctly.`
              : "It stops being offered when adding charges. Nothing is billing it, so nothing changes for anybody."
            : ""
        }
        confirmLabel="Retire it"
        cancelLabel="Keep it"
        pending={isPending}
        onConfirm={() => confirming && toggle(confirming)}
        onClose={() => setConfirming(null)}
      />

      {editingCharge && (
        <EditChargeModal charge={editingCharge} onClose={() => setEditingCharge(null)} />
      )}
    </>
  );
}
