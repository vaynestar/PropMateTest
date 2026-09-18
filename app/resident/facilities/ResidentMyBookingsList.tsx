"use client";

import { useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { cancelResidentBookingAction } from "./actions";
import { shortDate } from "@/lib/short-date";

export default function ResidentMyBookingsList({ myBookings }: { myBookings: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleCancel = (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel your booking?")) return;
    startTransition(async () => {
      try {
        const res = await cancelResidentBookingAction(bookingId);
        if (res?.error) alert(res.error);
      } catch {
        // A dropped connection used to throw out of the transition and replace
        // the whole page with the error screen (R6).
        alert("Couldn't reach the server. Check your connection and try again.");
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
        const isPast = !isCancelled && !!b.is_past;

        return (
          <div
            key={b.booking_id}
            className={`glass-card rounded-xl p-5 border flex flex-col justify-between transition-all ${
              isCancelled || isPast ? "border-outline-variant/30 bg-surface-container/40" : "border-primary/40 hover:border-primary/70"
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className={`font-bold text-base ${isCancelled || isPast ? "text-on-surface/80" : "text-on-surface"}`}>
                    {b.facility_name || "Facility"}
                  </h4>
                  <p className="text-xs text-on-surface/80 mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary">event</span>
                    {shortDate(b.booking_date, true)}
                  </p>
                </div>
                <StatusBadge status={isPast ? "Completed" : b.booking_status || "Confirmed"} />
              </div>

              <div className="flex items-center gap-2 border-t border-outline-variant/30 pt-3 mt-2">
                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                <span
                  className={`text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg border ${
                    isCancelled
                      ? "text-on-surface/70 line-through border-outline-variant/40 bg-surface-container-high/50"
                      : "text-on-surface border-primary/40 bg-primary/10"
                  }`}
                >
                  {b.start_time} – {b.end_time}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/30">
              {isPast ? (
                <span className="text-xs text-on-surface-variant font-medium block text-center">
                  Took place as booked
                </span>
              ) : !isCancelled ? (
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
                <span className="text-xs text-on-surface-variant font-medium block text-center">
                  Booking cancelled
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
