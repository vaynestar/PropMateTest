"use client";

import { useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import VisitorQRCode from "@/components/visitors/VisitorQRCode";
import VisitorPassModal from "@/components/visitors/VisitorPassModal";

interface ResidentVisitorRecord {
  visitor_id: string;
  visitor_name: string;
  visitor_ic_no: string;
  visitor_type?: string | null;
  destination?: string | null;
  vehicle_plate?: string | null;
  visit_purpose?: string | null;
  visit_date?: Date | string | null;
  status?: string | null;
  contact_no?: string | null;
  property?: { property_name: string } | null;
  lease?: {
    unit?: {
      unit_number: string;
      property?: { property_name: string } | null;
    };
    tenant?: { user_name: string };
  } | null;
}

export default function ResidentVisitorList({ visitors }: { visitors: ResidentVisitorRecord[] }) {
  const [selectedPass, setSelectedPass] = useState<ResidentVisitorRecord | null>(null);

  if (visitors.length === 0) {
    return (
      <div className="p-8 text-center text-on-surface-variant glass-card rounded-2xl">
        No visitors registered yet. Use the form above to register your expected guests.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-stack-md w-full">
        {visitors.map((v) => (
          <div
            key={v.visitor_id}
            className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3 w-full border border-outline-variant/50 hover:border-primary/40 transition-colors"
          >
            <div className="flex justify-between items-start mb-2 gap-3">
              <div className="flex gap-3 items-center min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {v.visitor_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3
                    className="font-bold text-white text-base truncate"
                    title={v.visitor_name}
                  >
                    {v.visitor_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                    IC: {v.visitor_ic_no}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={v.status || "Pending"} />
                {v.status === "Approved" && (
                  <button
                    type="button"
                    onClick={() => setSelectedPass(v)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2 py-1 rounded-lg transition-colors cursor-pointer pressable"
                    title="Click to view & download pass"
                  >
                    <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                    <span>View Pass</span>
                  </button>
                )}
              </div>
            </div>

            {/* Embedded QR Code Preview (Clickable) */}
            {v.status === "Approved" && (
              <div
                onClick={() => setSelectedPass(v)}
                className="self-center my-1 cursor-pointer group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-surface-container-high transition-colors"
                title="Click to expand & save QR Code"
              >
                <div className="relative group-hover:scale-105 transition-transform">
                  <VisitorQRCode value={v.visitor_id} />
                </div>
                <span className="text-[10px] text-primary group-hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">fullscreen</span>
                  Tap to expand QR
                </span>
              </div>
            )}

            {/* Visit Details Footer */}
            <div className="flex justify-between items-center w-full mt-1 pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
              <div className="flex flex-col">
                <span className="font-medium text-white">
                  {v.visit_date
                    ? new Date(v.visit_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </span>
                {v.vehicle_plate && (
                  <span className="font-mono text-amber-300 flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[13px]">directions_car</span>
                    {v.vehicle_plate}
                  </span>
                )}
              </div>

              <span
                className="font-medium text-primary max-w-[150px] truncate text-right"
                title={v.visit_purpose || "Guest"}
              >
                {v.visit_purpose || "Visiting Resident"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* EXPANDED PASS MODAL */}
      {selectedPass && (
        <VisitorPassModal
          visitor={selectedPass}
          onClose={() => setSelectedPass(null)}
        />
      )}
    </>
  );
}
