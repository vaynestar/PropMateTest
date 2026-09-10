"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateInvoicesAction, getEligibleLeasesAction } from "@/app/admin/invoices/actions";

export default function GenerateInvoicesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingLeases, setFetchingLeases] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedLeaseIds, setSelectedLeaseIds] = useState<Set<string>>(new Set());
  
  // Default to current month
  const [targetMonth, setTargetMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchLeases = async (monthStr: string) => {
    setFetchingLeases(true);
    try {
      const [year, month] = monthStr.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      const data = await getEligibleLeasesAction(d.toISOString());
      setLeases(data);
      // Only the leases that would actually produce an invoice. Selecting one
      // with nothing to bill used to look like billing it: the lease was
      // skipped and still counted in the confirmation.
      setSelectedLeaseIds(
        new Set(data.filter((l: any) => l.billable).map((l: any) => l.lease_id))
      );
    } catch (e) {
      alert("Failed to fetch eligible leases.");
    } finally {
      setFetchingLeases(false);
    }
  };

  const handleOpen = async () => {
    setModalOpen(true);
    await fetchLeases(targetMonth);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setTargetMonth(newMonth);
    fetchLeases(newMonth);
  };

  const billableLeases = leases.filter((l: any) => l.billable);
  const blockedLeases = leases.filter((l: any) => !l.billable);

  const toggleLease = (id: string) => {
    const next = new Set(selectedLeaseIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedLeaseIds(next);
  };

  const handleGenerate = async () => {
    if (selectedLeaseIds.size === 0) {
      alert("Please select at least one tenant to bill.");
      return;
    }
    setLoading(true);
    try {
      const [year, month] = targetMonth.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      const result = await generateInvoicesAction(Array.from(selectedLeaseIds), d.toISOString());
      alert(result.message);
      setModalOpen(false);
      router.refresh();
    } catch (e: any) {
      alert(`Error generating invoices: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        <span
          className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}
          style={{ fontSize: 18 }}
        >
          autorenew
        </span>
        {loading && !modalOpen ? "Loading..." : "Generate Monthly Invoices"}
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-slide-up max-h-[85vh]">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Generate Monthly Bills</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-on-surface-variant font-medium">Billing Month:</span>
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={handleMonthChange}
                    className="px-3 py-1.5 rounded-md bg-surface-container border border-outline-variant text-sm text-on-surface focus:border-primary outline-none"
                  />
                </div>
                <p className="text-sm text-on-surface-variant mt-2">
                  {leases.length} tenants are due for an invoice in this month.
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {fetchingLeases ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-primary">
                  <span className="material-symbols-outlined animate-spin text-[36px]">progress_activity</span>
                  <span className="text-xs font-semibold text-on-surface-variant">Checking eligible leases for {targetMonth}...</span>
                </div>
              ) : leases.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] opacity-50 mb-4 text-emerald-400">check_circle</span>
                  <p className="font-semibold text-on-surface">All active tenants have been billed for this month!</p>
                  <p className="text-xs text-on-surface-variant mt-1">Select a different month above or check lease statuses.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-sm font-bold text-on-surface">
                      Selected: {selectedLeaseIds.size} / {billableLeases.length}
                      {blockedLeases.length > 0 && (
                        <span className="ml-2 font-medium text-amber-300">
                          &middot; {blockedLeases.length} cannot be billed yet
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() =>
                        setSelectedLeaseIds(
                          selectedLeaseIds.size === billableLeases.length
                            ? new Set()
                            : new Set(billableLeases.map((l: any) => l.lease_id))
                        )
                      }
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedLeaseIds.size === billableLeases.length
                        ? "Deselect all"
                        : "Select all billable"}
                    </button>
                  </div>
                  {leases.map((l: any) => (
                    <label
                      key={l.lease_id}
                      className={`flex items-center gap-4 rounded-xl border p-3 transition-colors ${
                        l.billable
                          ? "cursor-pointer border-transparent hover:border-outline-variant/30 hover:bg-surface-container-high"
                          : "cursor-not-allowed border-amber-500/30 bg-amber-500/[0.06]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeaseIds.has(l.lease_id)}
                        onChange={() => toggleLease(l.lease_id)}
                        disabled={!l.billable}
                        className="h-5 w-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary disabled:opacity-40"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-on-surface">
                          {l.tenant?.user_name ?? "No tenant on the lease"}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          Unit {l.unit.unit_number}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {l.billable ? (
                          <>
                            <div className="text-sm font-semibold text-on-surface">
                              RM {l.billableAmount.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-on-surface-variant">
                              {l.chargeCount > 0
                                ? `${l.chargeCount} charge${l.chargeCount > 1 ? "s" : ""}`
                                : "Unit rent"}
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] font-medium leading-tight text-amber-300">
                            Nothing to bill
                            <span className="mt-0.5 block font-normal text-amber-300/75">
                              No charges, no unit rent
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  ))}

                  {blockedLeases.length > 0 && (
                    <p className="mt-1 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-200/90">
                      <span className="material-symbols-outlined text-[16px] leading-none">
                        info
                      </span>
                      <span>
                        {blockedLeases.length} lease
                        {blockedLeases.length > 1 ? "s" : ""} cannot be invoiced: no recurring
                        charges are set up and the unit has no monthly rent.{" "}
                        <a
                          href="/admin/billing/recurring-charges"
                          className="font-semibold underline"
                        >
                          Set up their charges
                        </a>{" "}
                        first.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-outline-variant/30 bg-surface-container-low flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="btn-outline px-6 py-2"
              >
                Cancel
              </button>
              {billableLeases.length > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={loading || selectedLeaseIds.size === 0}
                  className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>}
                  Confirm & Generate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
