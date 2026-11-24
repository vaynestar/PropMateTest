"use client";

import { useMemo, useState } from "react";
import { getAllActiveLeasesAction, manualGenerateInvoiceAction } from "@/app/admin/invoices/actions";
import { BTN } from "@/components/admin/ui";

export default function ManualInvoiceButton() {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [tenantQuery, setTenantQuery] = useState("");
  const [leaseId, setLeaseId] = useState("");

  /*
   * Searchable, and ordered by unit (user, 2026-11-24):
   *
   *   "For create invoice, should allow for filter or search for tenant,
   *    also change the sorting to sort by Unit Number"
   *
   * A bare <select> of every active tenancy in the building is a scroll, and
   * it arrived in whatever order the query returned. An office works unit by
   * unit — A-02-01 before A-12-11 — so the list is sorted that way, with the
   * numeric segments compared as numbers. Plain string sort puts A-12-11
   * before A-2-01, which is the kind of thing that makes a list feel broken.
   */
  const sortedLeases = useMemo(() => {
    const unitOf = (l: any) => String(l?.unit?.unit_number ?? "");
    return [...leases].sort((a, b) =>
      unitOf(a).localeCompare(unitOf(b), "en", { numeric: true, sensitivity: "base" })
    );
  }, [leases]);

  const visibleLeases = useMemo(() => {
    const q = tenantQuery.trim().toLowerCase();
    if (!q) return sortedLeases;
    return sortedLeases.filter(
      (l) =>
        String(l?.tenant?.user_name ?? "").toLowerCase().includes(q) ||
        String(l?.unit?.unit_number ?? "").toLowerCase().includes(q)
    );
  }, [sortedLeases, tenantQuery]);

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
        className={BTN.secondary}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        Create Invoice
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-slide-up max-h-[90dvh] overflow-y-auto">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
              <h2 className="text-xl font-bold text-on-surface">Manual invoice</h2>
              <button onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tenant-search" className="font-label-md text-on-surface-variant">
                  Who is being billed
                </label>
                <input
                  id="tenant-search"
                  type="text"
                  value={tenantQuery}
                  onChange={(e) => {
                    setTenantQuery(e.target.value);
                    // A filtered-out choice must not stay silently selected.
                    setLeaseId("");
                  }}
                  placeholder="Search a unit number or a name…"
                  className="rounded-lg border border-outline-variant bg-surface-container-high px-4 py-2 text-on-surface outline-none focus:border-primary"
                />
                <select
                  name="lease_id"
                  required
                  value={leaseId}
                  onChange={(e) => setLeaseId(e.target.value)}
                  size={Math.min(8, Math.max(3, visibleLeases.length + 1))}
                  className="rounded-lg border border-outline-variant bg-surface-container-high px-4 py-2 text-on-surface outline-none focus:border-primary"
                >
                  <option value="">
                    {visibleLeases.length === 0
                      ? `Nothing matches “${tenantQuery.trim()}”`
                      : "Choose a tenancy…"}
                  </option>
                  {visibleLeases.map((l) => (
                    <option key={l.lease_id} value={l.lease_id}>
                      {l.unit?.unit_number ?? "No unit"} — {l.tenant?.user_name ?? "No tenant"}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-on-surface-variant">
                  {visibleLeases.length} of {leases.length} tenancies, by unit number.
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-on-surface-variant">Billing month</label>
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
