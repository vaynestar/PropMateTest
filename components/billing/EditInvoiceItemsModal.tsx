"use client";

import { useState, useActionState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addInvoiceDetailAction,
  removeInvoiceDetailAction,
  unlockInvoiceAction,
} from "@/app/admin/invoices/actions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

export default function EditInvoiceItemsModal({
  invoice,
  chargeMasters,
  onClose,
}: {
  invoice: any;
  chargeMasters: any[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [details, setDetails] = useState<any[]>(invoice.details || []);
  const [totalAmount, setTotalAmount] = useState<number>(Number(invoice.total_amount) || 0);

  const [selectedChargeId, setSelectedChargeId] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [uom, setUom] = useState("item");

  const [addState, addAction, isAddPending] = useActionState(addInvoiceDetailAction, null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Locked once the invoice has been issued to the tenant, paid, or voided.
  // It used to lock on is_printed, so opening the PDF preview froze it silently.
  // `unlocked` tracks an issued invoice reopened during this session, so the
  // form comes alive immediately instead of waiting for the refresh to land.
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockState, unlockFormAction, isUnlocking] = useActionState(
    unlockInvoiceAction,
    null
  );

  const isPaid = invoice.status === "Paid";
  const isVoided = invoice.status === "Inactive";
  const isIssued = !!invoice.issued_at && !unlocked;
  const isLocked = isPaid || isIssued || isVoided;
  const lockReason = isPaid
    ? "This invoice has been paid"
    : isIssued
    ? "This invoice has been issued to the tenant"
    : isVoided
    ? "This invoice has been voided"
    : "";

  // Only an issued-but-unsettled invoice can be reopened. Paid and voided are
  // settled states with their own reversal (Unpay, Restore); unlocking is not
  // the tool for those, and offering it there would only produce a server error.
  const canUnlock = isIssued && !isPaid && !isVoided;

  useEffect(() => {
    if (unlockState?.success) {
      setUnlocked(true);
      setShowUnlock(false);
      setPassword("");
      router.refresh();
    }
  }, [unlockState, router]);

  const handleChargeSelect = (chargeId: string) => {
    if (isLocked) return;
    setSelectedChargeId(chargeId);
    const master = chargeMasters.find((c) => c.charge_id === chargeId);
    if (master) {
      setDescription(master.charge_name);
      setUnitPrice(Number(master.default_amount).toFixed(2));
      setUom(master.uom || "item");
    }
  };

  useEffect(() => {
    if (addState?.success) {
      if (addState.newDetail) {
        setDetails((prev) => [...prev, addState.newDetail]);
      }
      if (typeof addState.newTotal === "number") {
        setTotalAmount(addState.newTotal);
      }
      setDescription("");
      setUnitPrice("");
      setSelectedChargeId("");
      setQuantity("1");
      router.refresh();
    }
  }, [addState, router]);

  const handleRemoveDetail = (detailId: string) => {
    if (isLocked) return;
    setDeletingId(detailId);
    const formData = new FormData();
    formData.append("detail_id", detailId);
    formData.append("invoice_id", invoice.invoice_id);

    startTransition(async () => {
      const res = await removeInvoiceDetailAction(formData);
      setDeletingId(null);
      if (res?.success) {
        setDetails((prev) => {
          const next = prev.filter((d) => d.detail_id !== detailId);
          if (typeof res.newTotal === "number") {
            setTotalAmount(res.newTotal);
          } else {
            setTotalAmount(next.reduce((sum, d) => sum + Number(d.total_price), 0));
          }
          return next;
        });
        router.refresh();
      }
    });
  };

  const isDraft = !isLocked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container border border-outline-variant/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                receipt_long
              </span>
              <h3 className="font-title-md text-title-md text-on-surface font-bold">
                Edit Invoice Items: {invoice.invoice_no}
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Tenant: <strong>{invoice.lease?.tenant?.user_name}</strong> ({invoice.lease?.unit?.property?.property_name} - Unit {invoice.lease?.unit?.unit_number})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Helper / Lock Banner */}
          {isLocked ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] leading-none">lock</span>
                <span className="min-w-0">
                  <strong>Locked.</strong> {lockReason}, so its line items are fixed.{" "}
                  {canUnlock
                    ? "If a figure is wrong, unlock it, correct the items and issue it again."
                    : "Void it and raise a new one if the amounts are wrong."}
                </span>
                {canUnlock && !showUnlock && (
                  <button
                    type="button"
                    onClick={() => setShowUnlock(true)}
                    className="pressable ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-rose-400/40 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-rose-200 transition-colors hover:bg-rose-500/20"
                  >
                    <span className="material-symbols-outlined text-[15px] leading-none">
                      lock_open
                    </span>
                    Unlock
                  </button>
                )}
              </div>

              {canUnlock && showUnlock && (
                <form action={unlockFormAction} className="mt-3 border-t border-rose-500/20 pt-3">
                  <input type="hidden" name="invoice_id" value={invoice.invoice_id} />
                  <label
                    htmlFor="unlock-password"
                    className="block text-[11px] font-semibold text-rose-200"
                  >
                    Confirm it is you
                  </label>
                  <p className="mt-0.5 text-[11px] text-rose-300/80">
                    Enter your own admin password. The invoice goes back to draft and has to
                    be issued again once you are done.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      id="unlock-password"
                      name="password"
                      type="password"
                      autoFocus
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="min-w-0 flex-1 rounded-lg border border-rose-500/30 bg-surface-container-high px-3 py-2 text-xs text-white outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-rose-400"
                    />
                    <button
                      type="submit"
                      disabled={isUnlocking || !password}
                      className="pressable flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500/90 px-3 py-2 text-xs font-bold leading-none text-white transition-colors hover:bg-rose-500 disabled:opacity-40"
                    >
                      {isUnlocking && (
                        <span className="material-symbols-outlined animate-spin-slow text-[15px] leading-none">
                          progress_activity
                        </span>
                      )}
                      {isUnlocking ? "Checking…" : "Unlock"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUnlock(false);
                        setPassword("");
                      }}
                      disabled={isUnlocking}
                      className="pressable shrink-0 rounded-lg px-2.5 py-2 text-xs font-semibold leading-none text-rose-200/80 transition-colors hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  {unlockState?.error && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-200">
                      <span className="material-symbols-outlined text-[14px] leading-none">
                        error
                      </span>
                      {unlockState.error}
                    </p>
                  )}
                </form>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>
                <strong>{unlocked ? "Unlocked — back to draft." : "Draft."}</strong>{" "}
                {unlocked
                  ? "Correct the items, then issue the invoice again from the list."
                  : "Add or change line items freely. Once you issue this invoice to the tenant, the items are locked — only payment status can change after that."}
              </span>
            </div>
          )}

          {/* Current Invoice Line Items Table */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant mb-2">
              Current Line Items ({details.length})
            </h4>
            <div className="border border-outline-variant/40 rounded-xl overflow-hidden bg-surface-container-low">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-surface-container/60 border-b border-outline-variant/40 text-on-surface-variant font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Item Description</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                    <th className="px-4 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {details.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-on-surface-variant/70 italic">
                        No line items on this invoice.
                      </td>
                    </tr>
                  ) : (
                    details.map((d: any) => {
                      const isDeleting = deletingId === d.detail_id;
                      return (
                        <tr key={d.detail_id} className="hover:bg-surface-container-high/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {d.description}
                          </td>
                          <td className="px-4 py-3 text-center text-on-surface-variant">
                            {Number(d.quantity)} {d.uom}
                          </td>
                          <td className="px-4 py-3 text-right text-on-surface-variant font-mono">
                            RM {Number(d.unit_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-on-surface font-mono">
                            RM {Number(d.total_price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isLocked ? (
                              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40" title="Locked">
                                lock
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveDetail(d.detail_id)}
                                disabled={isDeleting}
                                className="text-rose-400 hover:text-rose-300 p-1 disabled:opacity-50"
                                title="Delete Item"
                              >
                                {isDeleting ? (
                                  <span className="material-symbols-outlined animate-spin text-[16px]">
                                    progress_activity
                                  </span>
                                ) : (
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {details.length > 0 && (
                    <tr className="bg-surface-container-high/50 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-right text-on-surface">
                        Invoice Grand Total:
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 text-sm font-mono">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add 1-by-1 Item Form */}
          {!isLocked && (
            <div className="border border-outline-variant/60 rounded-xl p-4 bg-surface-container-high/40">
              <h4 className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">add_circle</span>
                Add 1-by-1 Item To This Invoice
              </h4>

              {addState?.error && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {addState.error}
                </div>
              )}

              <form action={addAction} className="space-y-3">
                <input type="hidden" name="invoice_id" value={invoice.invoice_id} />
                <input type="hidden" name="charge_id" value={selectedChargeId} />
                <input type="hidden" name="uom" value={uom} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      Template Charge (Optional)
                    </label>
                    <select
                      value={selectedChargeId}
                      onChange={(e) => handleChargeSelect(e.target.value)}
                      disabled={isAddPending}
                      className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-primary"
                    >
                      <option value="">Custom Item / Select Template...</option>
                      {chargeMasters.map((c) => (
                        <option key={c.charge_id} value={c.charge_id}>
                          [{c.charge_type}] {c.charge_name} (RM {Number(c.default_amount).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      Item Description <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Water Excess / Access Card Replacement"
                      required
                      disabled={isAddPending}
                      className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      Unit Price (RM) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="unit_price"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                      required
                      disabled={isAddPending}
                      className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-3 py-2 text-white text-xs font-bold text-primary outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                      disabled={isAddPending}
                      className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-3 py-2 text-white text-xs font-medium outline-none focus:border-primary"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <button
                      type="submit"
                      disabled={isAddPending}
                      className="w-full btn-primary py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isAddPending ? (
                        <span className="material-symbols-outlined animate-spin text-[16px]">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      )}
                      {isAddPending ? "Adding..." : "+ Add Line Item"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-outline-variant/40 mt-4 flex items-center justify-between shrink-0 text-xs text-on-surface-variant">
          <div>
            {invoice.modifier?.user_name && (
              <span>Last edited by: <strong className="text-on-surface">{invoice.modifier.user_name}</strong></span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-on-surface text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
