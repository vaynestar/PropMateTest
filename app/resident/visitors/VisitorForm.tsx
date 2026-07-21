"use client";

import { useActionState, useEffect, useState } from "react";
import { registerVisitor } from "./actions";

export default function VisitorForm() {
  const [state, formAction, isPending] = useActionState(registerVisitor, null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      // Reset form handled natively or we can just show a success message
      setTimeout(() => setIsSuccess(false), 3000);
    }
  }, [state]);

  return (
    <div className="bg-[#151b2d] border border-[#4a4455] rounded-xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">person_add</span>
        Register New Visitor
      </h3>

      {isSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-slide-in">
          <span className="material-symbols-outlined">check_circle</span>
          Visitor successfully registered and pending guard approval.
        </div>
      )}

      {state?.error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="visitor_name" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Visitor Name
            </label>
            <input
              type="text"
              id="visitor_name"
              name="visitor_name"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white placeholder:text-[#4a4455] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="e.g. Ali Bin Abu"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="visitor_ic_no" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              IC / Passport Number
            </label>
            <input
              type="text"
              id="visitor_ic_no"
              name="visitor_ic_no"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white placeholder:text-[#4a4455] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="e.g. 900101-14-5555"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="vehicle_plate" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Vehicle Plate (Optional)
            </label>
            <input
              type="text"
              id="vehicle_plate"
              name="vehicle_plate"
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white placeholder:text-[#4a4455] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="e.g. WAB 1234"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="visit_date" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Visit Date
            </label>
            <input
              type="date"
              id="visit_date"
              name="visit_date"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="visit_purpose" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Purpose of Visit
            </label>
            <input
              type="text"
              id="visit_purpose"
              name="visit_purpose"
              required
              className="w-full bg-[#0c1324] border border-[#4a4455] rounded-lg px-4 py-2.5 text-white placeholder:text-[#4a4455] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              placeholder="e.g. Delivery, Visiting family, Maintenance"
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
              <span className="material-symbols-outlined">send</span>
            )}
            {isPending ? "Submitting..." : "Register Visitor"}
          </button>
        </div>
      </form>
    </div>
  );
}
