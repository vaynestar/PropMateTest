"use client";

import { useState, useActionState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addInvoiceDetailAction, removeInvoiceDetailAction } from "@/app/admin/invoices/actions";

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

  const isLocked = invoice.status === "Paid" || invoice.is_printed || invoice.status === "Inactive";
  const lockReason = invoice.status === "Paid"
    ? "This invoice is Paid"
    : invoice.is_printed
    ? "This invoice has been Printed / Exported"
    : invoice.status === "Inactive"
    ? "This invoice is Inactive / Disabled"
    : "";

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
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span><strong>Locked:</strong> {lockReason} and cannot be modified. To make changes, revert invoice status or create a new invoice.</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>Add one-off items (e.g. Access Card, Water Excess) or edit existing line items for <strong>this specific invoice only</strong>.</span>
            </div>
          )}

          {/* Current Invoice Line Items Table */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Current Line Items ({details.length})
            </h4>
            <div className="border border-outline-variant/40 rounded-xl overflow-hidden bg-surface-container-low">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-surface-container/60 border-b border-outline-variant/40 text-on-surface-variant uppercase font-semibold">
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
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-1.5">
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
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase">
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
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase">
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
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase">
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
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase">
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
