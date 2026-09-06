"use client";

import { useState } from "react";
import Link from "next/link";
import { saveLeaseChargesAction } from "@/app/admin/billing/recurring-charges/actions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(value);
}

export default function RecurringChargesClient({
  leases,
  chargeMasters,
}: {
  leases: any[];
  chargeMasters: any[];
  activePropertyName?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [chargeToAdd, setChargeToAdd] = useState("");
  
  // Drawer State
  const [editingCharges, setEditingCharges] = useState<{ id: string, charge_id: string, quantity: number, amount: number, name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // The server already scopes to the active property, so search is the only
  // filter left here.
  const filteredLeases = leases.filter((l) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      (l.tenant?.user_name ?? "").toLowerCase().includes(s) ||
      (l.unit?.unit_number ?? "").toLowerCase().includes(s)
    );
  });

  /**
   * Split a lease's charges into the rent line and everything else. The table
   * used to show the extras as a bare count in a circle ("1"), which is the one
   * thing this page exists to answer and the one thing that number does not
   * say: RM 2,000 rent against a RM 2,100 total left the extra RM 100 unnamed
   * until you opened the drawer.
   */
  const summarise = (l: any) => {
    const charges = l.lease_charges ?? [];
    const rentCharge = charges.find((c: any) => c.charge?.charge_name === "Monthly Rental");
    const rent = rentCharge ? Number(rentCharge.amount) * Number(rentCharge.quantity) : 0;
    const extras = charges
      .filter((c: any) => c !== rentCharge)
      .map((c: any) => ({
        name: c.charge?.charge_name ?? "Charge",
        amount: Number(c.amount) * Number(c.quantity),
      }));
    const total = charges.reduce(
      (sum: number, c: any) => sum + Number(c.amount) * Number(c.quantity),
      0
    );
    return { rentCharge, rent, extras, total };
  };

  // KPIs
  const totalMonthly = leases.reduce((sum, l) => sum + summarise(l).total, 0);
  const leasesWithoutRent = leases.filter((l) => !summarise(l).rentCharge).length;

  // Charges already on the lease are dropped from the add picker.
  const available = chargeMasters.filter(
    (m) => !editingCharges.some((c) => c.charge_id === m.charge_id)
  );

  const openDrawer = (lease: any) => {
    setSelectedLease(lease);
    const charges = lease.lease_charges.map((c: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      charge_id: c.charge_id ?? c.charge?.charge_id,
      quantity: Number(c.quantity),
      amount: Number(c.amount),
      name: c.charge?.charge_name ?? "Charge"
    }));
    setEditingCharges(charges);
    setChargeToAdd("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedLease(null), 300); // Wait for transition
  };

  const removeCharge = (id: string) => {
    setEditingCharges(prev => prev.filter(c => c.id !== id));
  };

  const updateCharge = (id: string, field: 'quantity' | 'amount', value: number) => {
    setEditingCharges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCharge = (chargeId: string) => {
    if (!chargeId) return;
    const master = chargeMasters.find((m) => m.charge_id === chargeId);
    if (master) {
      setEditingCharges(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          charge_id: master.charge_id,
          quantity: 1,
          amount: Number(master.default_amount),
          name: master.charge_name
        }
      ]);
    }
  };

  const saveChanges = async () => {
    if (!selectedLease) return;
    setIsSaving(true);
    try {
      const payload = editingCharges.map((c) => ({
        charge_id: c.charge_id,
        quantity: c.quantity,
        amount: c.amount,
      }));
      if (payload.some((c) => !c.charge_id)) {
        throw new Error(
          "One of these lines has lost its charge type. Reopen the drawer and try again."
        );
      }
      const tenantName = selectedLease.tenant?.user_name ?? "this lease";
      await saveLeaseChargesAction(selectedLease.lease_id, payload);
      setToast({
        type: "success",
        text: `Saved. ${tenantName} will be billed ${formatCurrency(
          editingCharges.reduce((acc, c) => acc + c.amount * c.quantity, 0)
        )} on the next invoice run. Invoices already raised are unchanged.`,
      });
      closeDrawer();
    } catch (e: any) {
      setToast({ type: "error", text: e.message || "Could not save the charges." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-6">
      {toast && (
        <div
          className={`animate-slide-in fixed right-6 top-20 z-[110] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md ${
            toast.type === "success"
              ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-200"
              : "border-rose-500/50 bg-rose-950/90 text-rose-200"
          }`}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <span className="min-w-0">{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="ml-1 shrink-0 opacity-70 transition-opacity hover:opacity-100"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">close</span>
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/admin/billing" className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors">
            ← Back to Billing
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-2 tracking-tight">Recurring charges</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">Rent and any extras billed to each tenant every month.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-64 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search tenant or unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container border border-outline-variant text-sm focus:border-primary outline-none transition-colors text-on-surface"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-2">
        <div className="col-span-12 md:col-span-6 glass-card rounded-xl p-6 flex flex-col justify-between border border-outline-variant/30">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-md text-label-md text-on-surface-variant">Billed each month</span>
            <span className="material-symbols-outlined text-primary/70">account_balance_wallet</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">{formatCurrency(totalMonthly)}</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 glass-card rounded-xl p-6 flex flex-col justify-between border border-outline-variant/30">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-md text-label-md text-on-surface-variant">Leases billed</span>
            <span className="material-symbols-outlined text-primary/70">description</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">{leases.length}</span>
          </div>
          {leasesWithoutRent > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <span className="material-symbols-outlined text-[16px] leading-none">warning</span>
              {leasesWithoutRent} {leasesWithoutRent === 1 ? "lease has" : "leases have"} no rent
              line — nothing will be invoiced
            </p>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden flex flex-col border border-outline-variant/30">
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
          <h3 className="font-title-lg text-title-lg text-on-surface">Active leases</h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-surface-container-highest/30 border-b border-outline-variant/50 text-on-surface-variant">
              <tr>
                <th className="px-6 py-3 font-label-md font-semibold">Tenant</th>
                <th className="px-6 py-3 font-label-md font-semibold">Unit</th>
                <th className="px-6 py-3 font-label-md font-semibold text-right">Base rent</th>
                <th className="px-6 py-3 font-label-md font-semibold">Extras</th>
                <th className="px-6 py-3 font-label-md font-semibold text-right">Monthly total</th>
                <th className="px-6 py-3 font-label-md font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredLeases.map((l: any) => {
                const { rentCharge, rent: baseRent, extras, total } = summarise(l);

                return (
                  <tr key={l.lease_id} className="hover:bg-surface-container-high/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-surface-bright flex items-center justify-center text-primary font-bold text-xs border border-outline-variant/50">
                          {l.tenant.user_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-on-surface">{l.tenant.user_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-surface-container-highest text-on-surface text-xs font-medium border border-outline-variant/50">
                        {l.unit.unit_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-on-surface">
                      {rentCharge ? (
                        formatCurrency(baseRent)
                      ) : (
                        <span
                          className="text-xs font-semibold text-amber-300"
                          title="This lease has no Monthly Rental line, so an invoice run will bill nothing for rent."
                        >
                          No rent line
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {extras.length === 0 ? (
                        <span className="text-xs text-on-surface-variant">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {extras.map((e: any, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded border border-outline-variant/50 bg-surface-container-highest px-2 py-0.5 text-xs text-on-surface"
                            >
                              {e.name}
                              <span className="font-medium text-on-surface-variant">
                                {formatCurrency(e.amount)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-primary-fixed-dim">{formatCurrency(total)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openDrawer(l)}
                        className="bg-primary/20 hover:bg-primary text-primary hover:text-on-primary border border-primary/40 px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        Edit charges
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLeases.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="material-symbols-outlined text-[28px] text-on-surface-variant/60">
                {leases.length === 0 ? "receipt_long" : "search_off"}
              </span>
              {leases.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-on-surface">
                    No active leases in this property
                  </p>
                  <p className="max-w-sm text-xs text-on-surface-variant">
                    Recurring charges hang off a lease. Create one and its rent line appears
                    here, ready to be invoiced each month.
                  </p>
                  <Link
                    href="/admin/leases"
                    className="pressable mt-2 rounded-lg border border-primary/40 bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
                  >
                    Go to leases
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-on-surface">
                    Nothing matches “{search}”
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Search looks at the tenant name and the unit number.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="pressable mt-2 rounded-lg border border-outline-variant/60 bg-surface-container-high px-3.5 py-2 text-xs font-semibold text-on-surface transition-colors hover:text-white"
                  >
                    Clear search
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-[100] transition-opacity"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-surface-container-lowest/90 backdrop-blur-xl border-l border-outline-variant/50 z-[101] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedLease && (
          <>
            <div className="px-6 py-5 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-low/50">
              <div>
                <h3 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">edit_document</span>
                  Edit Charges
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Tenant: {selectedLease.tenant.user_name} ({selectedLease.unit.unit_number})
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full p-2 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
                <span className="material-symbols-outlined text-[18px] leading-none">info</span>
                <span className="min-w-0">
                  These lines are billed every month. Changes apply to the{" "}
                  <strong>next invoice run</strong> — invoices already raised keep the
                  figures they were issued with.
                </span>
              </div>
              <h4 className="font-label-md text-label-md text-on-surface-variant mb-3">Charged every month</h4>
              <div className="space-y-3">
                {editingCharges.map(c => (
                  <div key={c.id} className="bg-surface-container rounded-lg border border-outline-variant/50 p-4 group relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary/70 text-sm">payments</span>
                        <div className="font-medium text-on-surface text-sm">{c.name}</div>
                      </div>
                      <button
                        onClick={() => removeCharge(c.id)}
                        className="text-error/70 hover:text-error transition-colors p-1"
                        title="Remove Charge"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <label className="block text-[10px] text-on-surface-variant mb-1 font-semibold">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={c.quantity}
                          onChange={(e) => updateCharge(c.id, 'quantity', Number(e.target.value))}
                          className="w-full bg-surface-container-highest border border-outline-variant/50 rounded py-1.5 px-3 text-sm text-on-surface focus:outline-none focus:border-primary font-medium"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-[10px] text-on-surface-variant mb-1 font-semibold">Price (RM)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs font-bold">RM</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={c.amount}
                            onChange={(e) => updateCharge(c.id, 'amount', Number(e.target.value))}
                            className="w-full bg-surface-container-highest border border-outline-variant/50 rounded py-1.5 pl-8 pr-2 text-sm text-on-surface focus:outline-none focus:border-primary font-bold text-primary"
                          />
                        </div>
                      </div>
                      <div className="w-1/3 flex flex-col justify-end">
                        <label className="block text-[10px] text-on-surface-variant mb-1 text-right font-semibold">Subtotal</label>
                        <div className="text-right font-bold text-on-surface py-1.5 text-sm">
                          {formatCurrency(c.amount * c.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {editingCharges.length === 0 && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    Nothing is billed on this lease yet. Add at least a rent line, or an
                    invoice run will produce nothing for this tenant.
                  </p>
                )}
              </div>

              <div className="mt-8 border-t border-outline-variant/50 pt-6">
                {/* Charges already on this lease are dropped from the picker so
                    the same line cannot be added twice. */}
                <h4 className="font-label-md text-label-md text-on-surface-variant mb-3">Add a charge</h4>
                <div className="flex items-end gap-3">
                  <div className="relative min-w-0 flex-1">
                    <select
                      id="addChargeSelect"
                      aria-label="Standard charge to add"
                      value={chargeToAdd}
                      onChange={(e) => setChargeToAdd(e.target.value)}
                      className="w-full appearance-none bg-surface-container-highest border border-outline-variant/50 rounded py-2 pl-3 pr-10 text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">Select standard charge…</option>
                      {available.map((m) => (
                        <option key={m.charge_id} value={m.charge_id}>
                          {m.charge_name} — {formatCurrency(Number(m.default_amount))}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">expand_more</span>
                  </div>
                  <button
                    type="button"
                    disabled={!chargeToAdd}
                    onClick={() => {
                      addCharge(chargeToAdd);
                      setChargeToAdd("");
                    }}
                    className="pressable flex shrink-0 items-center gap-2 rounded border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Add
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/50 bg-surface-container/50 flex justify-between items-center">
              <div>
                <div className="text-[11px] text-on-surface-variant">New monthly total</div>
                <div className="font-headline-md text-headline-md text-primary-fixed-dim">
                  {formatCurrency(editingCharges.reduce((acc, c) => acc + (c.amount * c.quantity), 0))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded text-on-surface-variant hover:bg-surface-variant font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChanges}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2 rounded font-medium text-sm shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
