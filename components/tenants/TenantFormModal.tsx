"use client";

import { useActionState, useEffect } from "react";
import { addTenant } from "@/app/admin/tenants/actions";

interface TenantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TenantFormModal({ isOpen, onClose }: TenantFormModalProps) {
  const [state, formAction, isPending] = useActionState(addTenant, null);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-surface-container border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Register Resident Account</h2>
              <p className="text-xs text-on-surface-variant">Create a new tenant account with portal login access</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">error</span>
              <span>{state.error}</span>
            </div>
          )}

          {state?.success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              <span>{state.message}</span>
            </div>
          )}

          <form action={formAction} id="add-tenant-form" className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Full Legal Name *</label>
                <span className="text-[11px] text-on-surface-variant">Official resident name</span>
              </div>
              <input
                name="user_name"
                placeholder="e.g., Alex Tan Wei Ming, Sarah Johnson"
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Email Address *</label>
                <span className="text-[11px] text-on-surface-variant">Login & billing delivery</span>
              </div>
              <input
                name="user_email"
                type="email"
                placeholder="e.g., alex.tan@example.com"
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Phone Number *</label>
                <span className="text-[11px] text-on-surface-variant">Primary mobile contact</span>
              </div>
              <input
                name="phone_number"
                placeholder="e.g., +6012-3456789"
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-on-surface-variant">
              <span className="font-semibold text-white">Initial Credentials:</span> Default account password will be set to <code className="text-primary font-mono font-bold bg-primary/20 px-1.5 py-0.5 rounded">Password123!</code>. The resident can change this upon first login.
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/40 bg-surface-container-high/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant border border-outline-variant/60 text-xs font-semibold text-on-surface-variant hover:text-white transition-all pressable"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-tenant-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Register Tenant</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
