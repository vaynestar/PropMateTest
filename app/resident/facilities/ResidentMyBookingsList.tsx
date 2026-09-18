"use client";

import { useTransition } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { cancelResidentBookingAction } from "./actions";
import { shortDate } from "@/lib/short-date";
import { getFacilityAccentColor } from "@/lib/facility-colors";

/**
 * My Bookings (DEV-187; user: "Facilities my booking no picture and design
 * seem not standardize with facilities"). Same card language as the facility
 * cards: rounded-2xl glass card, the facility photo (or its accent icon), bold
 * name, the date, and the time as the same sky-blue chip used on Home.
 * Upcoming bookings first; past and cancelled ones below, their photo greyed.
 */
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
      <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant">
        <span className="material-symbols-outlined text-[36px] opacity-40 mb-2">event_busy</span>
        <p className="font-body-md">You have no facility bookings yet.</p>
      </div>
    );
  }

  const upcoming = myBookings
    .filter((b) => b.booking_status !== "Cancelled" && !b.is_past)
    .sort((a, b) => (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time));
  const history = myBookings.filter((b) => b.booking_status === "Cancelled" || b.is_past);

  const card = (b: any) => {
    const isCancelled = b.booking_status === "Cancelled";
    const isPast = !isCancelled && !!b.is_past;
    const faded = isCancelled || isPast;
    const accent = getFacilityAccentColor(b.facility_type);

    return (
      <div
        key={b.booking_id}
        className={`glass-card rounded-2xl overflow-hidden border flex flex-col transition-colors ${
          faded ? "border-outline-variant/30" : "border-primary/40 hover:border-primary/70"
        }`}
      >
        <div className="flex gap-3 p-3">
          <div className={`relative w-24 h-24 shrink-0 rounded-xl overflow-hidden ${accent.bg} flex items-center justify-center`}>
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.image_url}
                alt=""
                loading="lazy"
                className={`absolute inset-0 w-full h-full object-cover ${faded ? "grayscale opacity-60" : ""}`}
              />
            ) : (
              <span className={`material-symbols-outlined text-[36px] ${accent.text}`}>{accent.icon}</span>
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-bold text-base leading-snug ${faded ? "text-on-surface/75" : "text-on-surface"}`}>
                {b.facility_name || "Facility"}
              </h4>
              <StatusBadge status={isPast ? "Completed" : b.booking_status || "Confirmed"} />
            </div>
            <p className="text-xs text-on-surface/80 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">event</span>
              {shortDate(b.booking_date, true)}
            </p>
            <span
              className={`self-start inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums border ${
                isCancelled
                  ? "text-on-surface/60 line-through border-outline-variant/40 bg-surface-container-high/50"
                  : faded
                  ? "text-on-surface/80 border-outline-variant/40 bg-surface-container-high/50"
                  : "bg-sky-500/15 border-sky-400/40 text-sky-200"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">schedule</span>
              {b.start_time} – {b.end_time}
            </span>
          </div>
        </div>

        {!faded && (
          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => handleCancel(b.booking_id)}
              disabled={isPending}
              className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all pressable disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              {isPending ? "Cancelling..." : "Cancel booking"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">event_upcoming</span>
            Upcoming ({upcoming.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{upcoming.map(card)}</div>
        </section>
      )}
      {history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">history</span>
            Past &amp; cancelled ({history.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{history.map(card)}</div>
        </section>
      )}
    </div>
  );
}
