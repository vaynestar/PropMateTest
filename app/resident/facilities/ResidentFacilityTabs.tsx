"use client";

import { useState } from "react";
import FacilityBooking from "./FacilityBooking";
import ResidentMyBookingsList from "./ResidentMyBookingsList";

type Facility = {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  property: { property_name: string };
  max_capacity: number | null;
  operation_days: string;
  open_time: string;
  close_time: string;
  max_booking_hours: number | null;
};

type Booking = {
  booking_id: string;
  facility_id: string;
  facility_name?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_status: string;
};

interface ResidentFacilityTabsProps {
  facilities: Facility[];
  myBookings: Booking[];
}

export default function ResidentFacilityTabs({
  facilities,
  myBookings,
}: ResidentFacilityTabsProps) {
  const [activeTab, setActiveTab] = useState<"facilities" | "my_bookings">("facilities");

  const activeBookingsCount = myBookings.filter((b) => b.booking_status !== "Cancelled").length;

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Requirement 1: Two Main Tabs Switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
        <div className="flex items-center gap-2 bg-surface-container-high p-1.5 rounded-2xl border border-outline-variant/40">
          <button
            type="button"
            onClick={() => setActiveTab("facilities")}
            className={`px-5 py-2.5 rounded-xl font-title-sm text-title-sm font-bold transition-all flex items-center gap-2 pressable ${
              activeTab === "facilities"
                ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">apartment</span>
            Facilities List
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === "facilities" ? "bg-black/20 text-black" : "bg-surface-container-highest text-on-surface"
              }`}
            >
              {facilities.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my_bookings")}
            className={`px-5 py-2.5 rounded-xl font-title-sm text-title-sm font-bold transition-all flex items-center gap-2 pressable ${
              activeTab === "my_bookings"
                ? "bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">event_note</span>
            My Bookings
            {activeBookingsCount > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "my_bookings" ? "bg-black/20 text-black" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {activeBookingsCount} active
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: Facilities List (2 Columns per row + Minimized layout) */}
      {activeTab === "facilities" && (
        <div className="animate-in fade-in duration-200">
          {facilities.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">meeting_room</span>
              <p className="font-body-lg text-body-lg font-semibold">No Bookable Facilities Available</p>
              <p className="text-xs">There are no facilities available for booking at this moment.</p>
            </div>
          ) : (
            <FacilityBooking facilities={facilities} bookings={myBookings} />
          )}
        </div>
      )}

      {/* TAB 2: My Active Bookings */}
      {activeTab === "my_bookings" && (
        <div className="animate-in fade-in duration-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title-lg text-title-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">calendar_month</span>
              My Bookings & Reservations
            </h2>
            <span className="text-xs text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full font-medium">
              Total {myBookings.length} bookings
            </span>
          </div>

          <ResidentMyBookingsList myBookings={myBookings} />
        </div>
      )}
    </div>
  );
}
