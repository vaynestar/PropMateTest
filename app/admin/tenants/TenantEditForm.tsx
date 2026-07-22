"use client";

import { useActionState, useState, useEffect } from "react";
import { updateTenant, resetTenantPassword } from "./actions";

type Tenant = {
  user_id: string;
  user_name: string;
  user_email: string;
  phone_number: string | null;
};

export default function TenantEditForm({ tenant }: { tenant: Tenant }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateTenant, null);
  const [resetState, setResetState] = useState<{ success?: string; error?: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Close modal on success
  useEffect(() => {
    if (state?.success) {
      setIsOpen(false);
      // Reset state can be managed, but since the component might unmount, it's fine.
    }
  }, [state]);

  const handleResetPassword = async () => {
    if (!confirm("Are you sure you want to reset this tenant's password?")) return;
    setIsResetting(true);
    setResetState(null);
    try {
      const res = await resetTenantPassword(tenant.user_id);
      if (res.success) {
        setResetState({ success: res.message });
      } else {
        setResetState({ error: res.error });
      }
    } catch (e: any) {
      setResetState({ error: "Failed to reset password." });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container/20 text-on-secondary-container hover:bg-secondary-container/40 rounded-md transition-colors text-sm font-medium"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !pending && setIsOpen(false)}
          />
          <div className="glass-card relative w-full max-w-lg rounded-xl overflow-hidden animate-slide-in">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
              <h2 className="font-title-lg text-title-lg text-on-surface">Edit Tenant</h2>
              <button 
                onClick={() => setIsOpen(false)}
                disabled={pending}
                className="text-on-surface-variant hover:bg-surface-variant rounded-full p-2 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              <form action={formAction} className="flex flex-col gap-5">
                <input type="hidden" name="user_id" value={tenant.user_id} />
                
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`user_name-${tenant.user_id}`} className="font-label-md text-label-md text-on-surface-variant">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    id={`user_name-${tenant.user_id}`}
                    name="user_name"
                    type="text"
                    required
                    defaultValue={tenant.user_name}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`user_email-${tenant.user_id}`} className="font-label-md text-label-md text-on-surface-variant">
                    Email Address (Login Username) <span className="text-error">*</span>
                  </label>
                  <input
                    id={`user_email-${tenant.user_id}`}
                    name="user_email"
                    type="email"
                    required
                    defaultValue={tenant.user_email}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-on-surface-variant/70 mt-1">
                    Warning: Changing this email will change the tenant's login credential.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`phone_number-${tenant.user_id}`} className="font-label-md text-label-md text-on-surface-variant">
                    Phone Number <span className="text-error">*</span>
                  </label>
                  <input
                    id={`phone_number-${tenant.user_id}`}
                    name="phone_number"
                    type="tel"
                    required
                    defaultValue={tenant.phone_number || ""}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                {state?.error && (
                  <div className="p-3 bg-error-container/20 border border-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    {state.error}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={pending}
                    className="px-4 py-2 font-label-md font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="px-4 py-2 bg-primary text-on-primary font-label-md font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {pending && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                    Save Changes
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-outline-variant/30 flex flex-col items-start gap-4">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Reset Password</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    If the tenant forgot their password, you can reset it to a temporary default password.
                  </p>
                </div>
                
                {resetState?.success && (
                  <div className="w-full p-3 bg-primary/20 border border-primary text-primary-fixed rounded-lg text-sm flex items-center justify-between">
                    <span>{resetState.success}</span>
                    <button onClick={() => navigator.clipboard.writeText(resetState.success!.split(": ")[1])} className="text-primary hover:text-primary-fixed" title="Copy to clipboard">
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>
                )}
                {resetState?.error && (
                  <div className="w-full p-3 bg-error-container/20 border border-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    {resetState.error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResetting || pending}
                  className="flex items-center gap-2 px-4 py-2 border border-outline-variant/50 text-on-surface hover:bg-surface-variant rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isResetting ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  )}
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
