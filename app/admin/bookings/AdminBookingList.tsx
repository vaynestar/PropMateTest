"use client";

import { useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { updateBookingStatus } from "./actions";

export default function AdminBookingList({ bookings }: { bookings: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateStatus = (bookingId: string, status: string) => {
    startTransition(() => {
      updateBookingStatus(bookingId, status);
    });
  };

  if (bookings.length === 0) {
    return (
      <div className="col-span-full p-8 text-center text-on-surface-variant border border-dashed border-[#4a4455] rounded-xl">
        No facility bookings found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookings.map((b) => {
        const startDate = new Date(b.start_time);
        const endDate = new Date(b.end_time);
        return (
          <div key={b.booking_id} className="bg-surface-container border border-[#4a4455] rounded-xl p-5 shadow-lg relative group hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-white truncate max-w-[200px]" title={b.facility.facility_name}>
                  {b.facility.facility_name}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Unit {b.lease?.unit?.unit_number} - {b.lease?.tenant?.user_name}
                </p>
              </div>
              <StatusBadge status={b.booking_status || "Pending"} />
            </div>
            
            <div className="space-y-2 mt-4 text-sm text-on-surface-variant border-t border-[#4a4455]/50 pt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  <span>Date</span>
                </div>
                <span className="text-white">
                  {b.booking_date ? new Date(b.booking_date).toLocaleDateString("en-GB") : "-"}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Time</span>
                </div>
                <span className="text-white">
                  {startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#4a4455]/50 flex gap-2">
              {b.booking_status !== "Cancelled" && b.booking_status !== "Rejected" ? (
                <button
                  onClick={() => handleUpdateStatus(b.booking_id, "Cancelled")}
                  disabled={isPending}
                  className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel Booking
                </button>
              ) : (
                <div className="w-full py-2 text-center text-on-surface-variant text-sm font-medium opacity-50">
                  {b.booking_status}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
