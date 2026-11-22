"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RowMenu, { type RowMenuItem } from "@/components/admin/RowMenu";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Toast, type ToastState } from "@/components/admin/Toast";
import { removeUnit } from "@/app/admin/units/actions";

/**
 * Edit and delete for one unit (DEV-263).
 *
 * Delete used to be a red button on every unit card — once per unit, on a
 * screen that can hold 240 of them — and a card has no room to say what
 * deleting one destroys. Here the dialog can name it: the tenancies, the
 * invoices, the tickets. And when something is in the way, the menu item is
 * disabled with the reason rather than letting the attempt fail at the
 * database.
 */
export default function UnitFileActions({
  unitId,
  unitNumber,
  hasActiveLease,
  invoiceCount,
  repairCount,
}: {
  unitId: string;
  unitNumber: string;
  hasActiveLease: boolean;
  invoiceCount: number;
  repairCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const blocked = hasActiveLease
    ? "A tenancy is running on it. End the lease first."
    : invoiceCount > 0
    ? `${invoiceCount} invoice${invoiceCount === 1 ? " has" : "s have"} been raised against it.`
    : null;

  const doDelete = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("unit_id", unitId);
      const res: any = await removeUnit(null, fd);
      if (res?.error) {
        setConfirming(false);
        setToast({ message: res.error, tone: "error" });
        return;
      }
      router.push("/admin/units");
    });
  };

  const items: RowMenuItem[] = [
    {
      label: "Edit this unit",
      onSelect: () => router.push(`/admin/units?edit=${unitId}`),
    },
    {
      label: "Delete this unit",
      onSelect: () => setConfirming(true),
      danger: true,
      disabled: !!blocked,
      hint: blocked ?? undefined,
    },
  ];

  return (
    <>
      <RowMenu label={`More actions for unit ${unitNumber}`} items={items} />

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={`Delete unit ${unitNumber}?`}
        body={
          repairCount > 0
            ? `The unit is removed from the register for good. Its ${repairCount} repair record${
                repairCount === 1 ? "" : "s"
              } lose the unit they were raised against, and nothing here can be recovered.`
            : "The unit is removed from the register for good. Nothing is billing it and nothing is recorded against it, so nothing else changes — but it cannot be recovered."
        }
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        irreversible="This cannot be undone."
        pending={isPending}
        onConfirm={doDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
