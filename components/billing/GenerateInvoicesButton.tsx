"use client";

import { useState } from "react";
import { generateInvoicesAction, getEligibleLeasesAction } from "@/app/admin/invoices/actions";

export default function GenerateInvoicesButton() {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedLeaseIds, setSelectedLeaseIds] = useState<Set<string>>(new Set());
  
  // Default to current month
  const [targetMonth, setTargetMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchLeases = async (monthStr: string) => {
    setLoading(true);
    try {
      // Create a date corresponding to the 1st of the selected month
      const [year, month] = monthStr.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      const data = await getEligibleLeasesAction(d.toISOString());
      setLeases(data);
      setSelectedLeaseIds(new Set(data.map((l: any) => l.lease_id)));
    } catch (e) {
      alert("Failed to fetch eligible leases.");
    } finally {
      setLoading(false);
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
              {leases.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] opacity-50 mb-4">check_circle</span>
                  <p>All active tenants have been billed for this month!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-sm font-bold text-on-surface">
                      Selected: {selectedLeaseIds.size} / {leases.length}
                    </span>
                    <button
                      onClick={() => setSelectedLeaseIds(selectedLeaseIds.size === leases.length ? new Set() : new Set(leases.map((l: any) => l.lease_id)))}
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedLeaseIds.size === leases.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  {leases.map(l => (
                    <label key={l.lease_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30">
                      <input
                        type="checkbox"
                        checked={selectedLeaseIds.has(l.lease_id)}
                        onChange={() => toggleLease(l.lease_id)}
                        className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-high"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-on-surface">{l.tenant.user_name}</div>
                        <div className="text-xs text-on-surface-variant">Unit {l.unit.unit_number}</div>
                      </div>
                      <div className="text-right">
                        {l.lease_charges?.length > 0 ? (
                          <span className="text-sm font-medium text-emerald-400">
                            {l.lease_charges.length} item(s)
                          </span>
                        ) : (
                          <span className="text-sm text-on-surface-variant">
                            Default RM {Number(l.unit.monthly_rent)}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
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
              {leases.length > 0 && (
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
