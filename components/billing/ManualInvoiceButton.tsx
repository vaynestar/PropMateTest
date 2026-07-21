"use client";

import { useState } from "react";
import { getAllActiveLeasesAction, manualGenerateInvoiceAction } from "@/app/admin/invoices/actions";

export default function ManualInvoiceButton() {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const data = await getAllActiveLeasesAction();
      setLeases(data);
      setModalOpen(true);
    } catch (e) {
      alert("Failed to fetch leases.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await manualGenerateInvoiceAction(formData);
      alert(res.message);
      setModalOpen(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="btn-outline px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        Create Invoice
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-slide-up">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
              <h2 className="text-xl font-bold text-on-surface">Manual Invoice</h2>
              <button onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface-variant">Select Tenant</label>
                <select name="lease_id" required className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none">
                  <option value="">-- Choose Tenant --</option>
                  {leases.map(l => (
                    <option key={l.lease_id} value={l.lease_id}>
                      {l.tenant.user_name} (Unit {l.unit.unit_number})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface-variant">Billing Month</label>
                <input 
                  type="month" 
                  name="month" 
                  required 
                  defaultValue={new Date().toISOString().slice(0,7)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface focus:border-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline px-6 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>}
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
