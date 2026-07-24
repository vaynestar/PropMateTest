"use client";

import { useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { cancelResidentBookingAction } from "./actions";

export default function ResidentMyBookingsList({ myBookings }: { myBookings: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleCancel = (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel your booking?")) return;
    startTransition(async () => {
      const res = await cancelResidentBookingAction(bookingId);
      if (res?.error) {
        alert(res.error);
      }
    });
  };

  if (!myBookings || myBookings.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-on-surface-variant">
        <span className="material-symbols-outlined text-[36px] opacity-40 mb-2">event_busy</span>
        <p className="font-body-md">You have no facility bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {myBookings.map((b) => {
        const isCancelled = b.booking_status === "Cancelled";

        return (
          <div
            key={b.booking_id}
            className={`glass-card rounded-xl p-5 border flex flex-col justify-between transition-all ${
              isCancelled ? "opacity-60 border-outline-variant/30" : "border-outline-variant/60 hover:border-primary/50"
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-on-surface text-base">
                    {b.facility_name || "Facility"}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                    📅 {b.booking_date}
                  </p>
                </div>
                <StatusBadge status={b.booking_status || "Reserved"} />
              </div>

              <div className="space-y-1.5 text-xs text-on-surface-variant border-t border-outline-variant/30 pt-3 mt-2">
                <div className="flex justify-between items-center">
                  <span>Reserved Time:</span>
                  <span className="font-semibold text-on-surface font-mono">
                    {b.start_time} – {b.end_time}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/30">
              {!isCancelled ? (
                <button
                  type="button"
                  onClick={() => handleCancel(b.booking_id)}
                  disabled={isPending}
                  className="w-full py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all pressable disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  {isPending ? "Cancelling..." : "Cancel My Booking"}
                </button>
              ) : (
                <span className="text-xs text-on-surface-variant/60 font-medium block text-center italic">
                  Booking Cancelled
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
