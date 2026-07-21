"use client";

import { useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateVisitorStatus } from "./actions";

export default function AdminVisitorList({ visitors }: { visitors: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateStatus = (visitorId: string, status: string) => {
    startTransition(() => {
      updateVisitorStatus(visitorId, status);
    });
  };

  if (visitors.length === 0) {
    return (
      <div className="p-8 text-center text-on-surface-variant border border-dashed border-[#4a4455] rounded-xl">
        No visitors found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visitors.map((v) => (
        <div key={v.visitor_id} className="bg-surface-container border border-[#4a4455] rounded-xl p-5 shadow-lg relative group hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-white truncate max-w-[200px]" title={v.visitor_name}>
                {v.visitor_name}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Unit {v.lease?.unit?.unit_number} - {v.lease?.tenant?.user_name}
              </p>
            </div>
            <StatusBadge status={v.status || "Pending"} />
          </div>
          
          <div className="space-y-2 mt-4 text-sm text-on-surface-variant border-t border-[#4a4455]/50 pt-4">
            <div className="flex justify-between">
              <span>IC/Passport</span>
              <span className="text-white font-mono">{v.visitor_ic_no}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span className="text-white">
                {v.visit_date ? new Date(v.visit_date).toLocaleDateString("en-GB") : "-"}
              </span>
            </div>
            {v.vehicle_plate && (
              <div className="flex justify-between">
                <span>Vehicle</span>
                <span className="text-white">{v.vehicle_plate}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Purpose</span>
              <span className="text-white truncate max-w-[150px] text-right" title={v.visit_purpose}>
                {v.visit_purpose || "-"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#4a4455]/50 flex gap-2">
            {v.status === "Pending" ? (
              <>
                <button
                  onClick={() => handleUpdateStatus(v.visitor_id, "Approved")}
                  disabled={isPending}
                  className="flex-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleUpdateStatus(v.visitor_id, "Declined")}
                  disabled={isPending}
                  className="flex-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Decline
                </button>
              </>
            ) : v.status === "Approved" ? (
              <button
                onClick={() => handleUpdateStatus(v.visitor_id, "Completed")}
                disabled={isPending}
                className="w-full bg-[#1e253a] text-on-surface-variant hover:text-white border border-[#4a4455] hover:border-primary/50 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Mark Completed
              </button>
            ) : (
              <div className="w-full py-2 text-center text-on-surface-variant text-sm font-medium opacity-50">
                {v.status}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
