"use client";

import { useActionState, useEffect, useState, useMemo, useRef } from "react";
import { adminCreateLease } from "./actions";

export default function AdminLeaseForm({ 
  units, 
  users 
}: { 
  units: any[], 
  users: any[] 
}) {
  const [state, formAction, isPending] = useActionState(adminCreateLease, null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Searchable Tenant Combobox State
  const [tenantQuery, setTenantQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      setSelectedUserId("");
      setTenantQuery("");
      setTimeout(() => setIsSuccess(false), 3000);
    }
  }, [state]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const vacantUnits = units.filter(u => u.status === "Vacant");

  const filteredUsers = useMemo(() => {
    if (!tenantQuery.trim()) return users;
    const q = tenantQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.user_name.toLowerCase().includes(q) ||
        u.user_email.toLowerCase().includes(q) ||
        (u.phone_number && u.phone_number.toLowerCase().includes(q))
    );
  }, [users, tenantQuery]);

  return (
    <div className="bg-surface-container border border-[#4a4455] rounded-xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      {isSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-slide-in">
          <span className="material-symbols-outlined">check_circle</span>
          Lease successfully created.
        </div>
      )}

      {state?.error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {state?.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Typeable Searchable Tenant Combobox */}
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Tenant (Resident) <span className="text-rose-400">*</span>
            </label>
            <input type="hidden" name="user_id" value={selectedUserId} required />
            
            <div className="relative">
              <input
                type="text"
                placeholder="Type to search tenant by Name | Phone | Email..."
                value={tenantQuery}
                onChange={(e) => {
                  setTenantQuery(e.target.value);
                  setSelectedUserId("");
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg pl-9 pr-9 py-2.5 text-white placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary text-sm transition-colors"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              {selectedUserId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserId("");
                    setTenantQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white p-0.5 rounded-full"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              ) : (
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
                  expand_more
                </span>
              )}
            </div>

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-[#0c1324] border border-[#4a4455] rounded-xl shadow-2xl z-50 divide-y divide-[#4a4455]/40 animate-fade-in">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-xs text-on-surface-variant text-center">
                    No residents found matching "{tenantQuery}"
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = u.user_id === selectedUserId;
                    return (
                      <div
                        key={u.user_id}
                        onClick={() => {
                          setSelectedUserId(u.user_id);
                          setTenantQuery(u.user_name);
                          setIsDropdownOpen(false);
                        }}
                        className={`p-3 hover:bg-primary/20 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors ${
                          isSelected ? "bg-primary/20 text-primary font-semibold border-l-4 border-primary" : "text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                            {u.user_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-white truncate">{u.user_name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant shrink-0">
                          {u.phone_number && (
                            <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-[#4a4455]">
                              {u.phone_number}
                            </span>
                          )}
                          <span className="truncate max-w-[140px] text-on-surface-variant/80">
                            {u.user_email}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[16px] shrink-0">
                              check_circle
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="unit_id" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Vacant Unit
            </label>
            <select
              id="unit_id"
              name="unit_id"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary"
            >
              <option value="">Select Unit...</option>
              {vacantUnits.map((u) => (
                <option key={u.unit_id} value={u.unit_id}>
                  {u.property.property_name} - Unit {u.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="move_in_date" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Move-in Date
            </label>
            <input
              type="date"
              id="move_in_date"
              name="move_in_date"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="move_out_date" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Move-out Date (Optional)
            </label>
            <input
              type="date"
              id="move_out_date"
              name="move_out_date"
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="gradient-btn px-6 py-2.5 rounded-lg font-medium text-white shadow-lg flex items-center gap-2 disabled:opacity-50 pressable"
          >
            {isPending ? (
              <span className="material-symbols-outlined animate-spin-slow">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">description</span>
            )}
            {isPending ? "Creating..." : "Create Lease"}
          </button>
        </div>
      </form>
    </div>
  );
}
