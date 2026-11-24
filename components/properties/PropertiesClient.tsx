"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rowOpenProps } from "@/components/admin/rowLink";
import Link from "next/link";
import { PropertyData } from "./PropertyCard";
import PropertyFormModal from "./PropertyFormModal";
import PropertyEditModal from "./PropertyEditModal";
import PropertyDeleteModal from "./PropertyDeleteModal";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { BTN, EmptyState, Money, TABLE } from "@/components/admin/ui";
import { setActiveProperty } from "@/app/actions/property-actions";
import { archiveProperty } from "@/app/admin/properties/actions";

/**
 * Properties (rebuilt DEV-262, to the batch-2 `Properties` artboard).
 *
 * Three changes.
 *
 *   · **A property is a row of numbers now.** It used to be a card with a
 *     name, an address and a unit count. Units, occupancy, money owed and
 *     open repairs are the four things that tell an administrator which
 *     building needs them this morning, and each of them was a separate
 *     screen away.
 *   · **Default is a badge, not a control on every row.** Only one property
 *     can hold it, so a "Set as default" button on all five was noise on
 *     four of them. It moved into the row menu.
 *   · **Archive is the primary action and delete is in the menu**, with a
 *     panel saying plainly what each one costs. They were equally prominent,
 *     and only one of them is reversible.
 *
 * The search box and the type filter went with the cards. Five buildings do
 * not need to be searched, and the type filter sorted them into categories
 * nobody was asking a question about.
 */
export default function PropertiesClient({
  initialProperties,
  activePropertyId,
  owedByProperty = {},
  repairsByProperty = {},
}: {
  initialProperties: PropertyData[];
  activePropertyId: string;
  owedByProperty?: Record<string, number>;
  repairsByProperty?: Record<string, number>;
}) {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyData | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<PropertyData | null>(null);
  const [archiving, setArchiving] = useState<PropertyData | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const archivedCount = initialProperties.filter((p) => p.is_archived).length;
  const rows = initialProperties.filter((p) => (showArchived ? true : !p.is_archived));

  const switchTo = (p: PropertyData) => {
    startTransition(async () => {
      await setActiveProperty(p.property_id);
      router.refresh();
      setToast({ message: `Now working in ${p.property_name}.` });
    });
  };

  const setArchived = (p: PropertyData, archived: boolean) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("property_id", p.property_id);
      fd.set("archived", archived ? "true" : "false");
      const res: any = await archiveProperty(null, fd);
      setArchiving(null);
      if (res?.error) {
        setToast({ message: res.error, tone: "error" });
        return;
      }
      router.refresh();
      setToast({
        message: archived ? `${p.property_name} is archived.` : `${p.property_name} is back.`,
        detail: archived ? "Its invoices, tickets and tenancies are all kept." : undefined,
      });
    });
  };

  const menuFor = (p: PropertyData): RowMenuItem[] => {
    const isActive = p.property_id === activePropertyId;
    const units = p._count?.units ?? 0;
    return [
      { label: "Edit its details", onSelect: () => setEditingProperty(p) },
      ...(isActive || p.is_archived
        ? []
        : [{ label: "Work in this property", onSelect: () => switchTo(p) }]),
      p.is_archived
        ? { label: "Bring it back", onSelect: () => setArchived(p, false) }
        : { label: "Archive it", onSelect: () => setArchiving(p), danger: true },
      {
        label: "Delete it for good",
        onSelect: () => setDeletingProperty(p),
        danger: true,
        disabled: units > 0,
        hint: units > 0 ? `${units} unit${units === 1 ? "" : "s"} still belong to it` : undefined,
      },
    ];
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 accent-[#d0bcff]"
              />
              Show the {archivedCount} archived
            </label>
          )}
        </div>
        <button type="button" onClick={() => setIsAddModalOpen(true)} className={BTN.primary}>
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add a property
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container">
        <div className={TABLE.wrap}>
          <table className={TABLE.table + " min-w-[940px]"}>
            <caption className="sr-only">Properties this office manages</caption>
            <thead>
              <tr>
                <th className={TABLE.th}>Property</th>
                <th className={TABLE.thNum}>Units</th>
                <th className={TABLE.thNum}>Occupied</th>
                <th className={TABLE.thNum}>Owed</th>
                <th className={TABLE.thNum}>Open repairs</th>
                <th className={TABLE.thNum}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon="domain"
                      title="No buildings on the register"
                      hint="Add the first property — every unit, tenancy and invoice hangs off one."
                      action={
                        <button type="button" onClick={() => setIsAddModalOpen(true)} className={BTN.primary}>
                          Add a property
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const units = p._count?.units ?? 0;
                  const occupied = p.units ? p.units.filter((u) => u.status === "Occupied").length : 0;
                  const pct = units > 0 ? Math.round((occupied / units) * 100) : 0;
                  const owed = owedByProperty[p.property_id] ?? 0;
                  const repairs = repairsByProperty[p.property_id] ?? 0;
                  const isActive = p.property_id === activePropertyId;

                  return (
                    <tr
                      key={p.property_id}
                      /* The row opens the property (DEV-280). */
                      {...rowOpenProps(() => setEditingProperty(p), `Open ${p.property_name}`)}
                      className={
                        TABLE.tr + " cursor-pointer" + (p.is_archived ? " opacity-60" : "")
                      }
                    >
                      <td className={TABLE.td + " align-top"}>
                        <span className="flex flex-wrap items-baseline gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingProperty(p)}
                            className="border-b border-primary/35 pb-px font-bold text-on-surface hover:text-primary"
                          >
                            {p.property_name}
                          </button>
                          {p.is_default && (
                            <span className="rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              Default
                            </span>
                          )}
                          {isActive && !p.is_default && (
                            <span className="rounded-full border border-outline-variant bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              In use
                            </span>
                          )}
                          {p.is_archived && (
                            <span className="rounded-full border border-outline-variant bg-surface-container-highest px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                              Archived
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[11px] text-on-surface-variant">
                          {[p.address, p.postal_code, p.city].filter(Boolean).join(", ")}
                        </span>
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        {units > 0 ? (
                          <Link href="/admin/units" className="text-on-surface hover:text-primary hover:underline">
                            {units}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant/50">—</span>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        {units > 0 ? (
                          <>
                            <span className="font-bold text-on-surface">{pct}%</span>
                            <span className="mt-0.5 block whitespace-nowrap text-[11px] text-on-surface-variant">
                              {occupied} of {units}
                            </span>
                          </>
                        ) : (
                          <span className="text-on-surface-variant/50">—</span>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " whitespace-nowrap align-top"}>
                        {owed > 0 ? (
                          <Link
                            href="/admin/billing/arrears"
                            className="font-bold text-rose-300 hover:underline"
                          >
                            <Money value={owed} />
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant/50">nothing</span>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        {repairs > 0 ? (
                          <Link href="/admin/maintenance" className="text-on-surface hover:text-primary hover:underline">
                            {repairs}
                          </Link>
                        ) : (
                          <span className="text-on-surface-variant/50">none</span>
                        )}
                      </td>

                      <td className={TABLE.tdNum + " align-top"}>
                        <span className="inline-flex items-center justify-end gap-2">
                          {isActive ? (
                            <Link href="/admin" className={BTN.primary + " h-9 text-xs"}>
                              Open
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={isPending || p.is_archived}
                              onClick={() => switchTo(p)}
                              title={p.is_archived ? "Archived properties cannot be worked in" : undefined}
                              className={BTN.secondary + " h-9 whitespace-nowrap text-xs"}
                            >
                              Switch to it
                            </button>
                          )}
                          <RowMenu label={`More actions for ${p.property_name}`} items={menuFor(p)} />
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

      {/* Archive against delete, said plainly. Both used to be buttons of
          equal weight, and only one of them can be undone. */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container p-4">
        <h2 className="text-[15px] font-bold text-on-surface">Archive or delete</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-high px-4 py-3">
            <p className="text-sm font-bold text-on-surface">Archive — the usual one</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              It leaves the property switcher and stops appearing in reports. Every invoice, ticket and
              tenancy is kept, and it can come back.
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/[0.06] px-4 py-3">
            <p className="text-sm font-bold text-rose-300">Delete — almost never</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Only possible while a property has no units, no tenancies and no invoices. Anything else and
              the menu says what is in the way rather than letting you try.
            </p>
          </div>
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={!!archiving}
        tone="danger"
        title={archiving ? `Archive ${archiving.property_name}?` : ""}
        body={
          archiving
            ? `It leaves the property switcher and drops out of reports. Its ${
                archiving._count?.units ?? 0
              } unit${(archiving._count?.units ?? 0) === 1 ? "" : "s"}, and every invoice, ticket and tenancy against them, are kept exactly as they are.`
            : ""
        }
        confirmLabel="Archive it"
        cancelLabel="Keep it active"
        pending={isPending}
        onConfirm={() => archiving && setArchived(archiving, true)}
        onClose={() => setArchiving(null)}
      />

      <PropertyFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <PropertyEditModal
        property={editingProperty}
        isOpen={!!editingProperty}
        onClose={() => setEditingProperty(null)}
      />

      <PropertyDeleteModal
        property={deletingProperty}
        isOpen={!!deletingProperty}
        onClose={() => setDeletingProperty(null)}
      />
    </div>
  );
}
