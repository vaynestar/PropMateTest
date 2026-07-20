"use client";

import { useMemo, useState } from "react";
import FacilityBookingCard from "./FacilityBookingCard";

type Facility = {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  property: { property_name: string };
  max_capacity: number;
  is_bookable: boolean;
  operation_days: string;
  open_time: string;
  close_time: string;
};

type Booking = {
  booking_id: string;
  booking_date: string | Date;
  start_time: string;
  end_time: string;
  booking_status: string;
};

export default function FacilitiesBrowser({
  facilities,
  bookings,
}: {
  facilities: Facility[];
  bookings: Booking[];
}) {
  const types = useMemo(() => {
    const set = new Set(facilities.map((f) => f.facility_type));
    return ["All", ...Array.from(set).sort()];
  }, [facilities]);

  const [active, setActive] = useState("All");

  const filtered = useMemo(
    () =>
      active === "All"
        ? facilities
        : facilities.filter((f) => f.facility_type === active),
    [facilities, active]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Facility[]>();
    for (const f of filtered) {
      const list = map.get(f.facility_type) ?? [];
      list.push(f);
      map.set(f.facility_type, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActive(t)}
            className={`shrink-0 px-4 py-2 rounded-full font-label-md text-label-md border transition-all active:scale-95 ${
              active === t
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-container-high text-on-surface-variant border-outline-variant"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No facilities found.
        </p>
      )}

      {grouped.map(([type, list]) => (
        <section key={type} className="space-y-3">
          <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              category
            </span>
            {type}
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              ({list.length})
            </span>
          </h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {list.map((f) => (
              <FacilityBookingCard
                key={f.facility_id}
                facility={f}
                bookings={bookings}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
