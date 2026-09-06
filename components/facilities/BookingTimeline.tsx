"use client";

import React from "react";

type BookingSlot = {
  start_time: number; // in minutes from midnight
  end_time: number; // in minutes from midnight
  label?: string;
};

type BookingTimelineProps = {
  dayStart: number;
  dayEnd: number;
  bookings: BookingSlot[];
  selectedStart?: number;
  selectedEnd?: number;
  hasClash?: boolean;
};

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export default function BookingTimeline({
  dayStart,
  dayEnd,
  bookings,
  selectedStart,
  selectedEnd,
  hasClash,
}: BookingTimelineProps) {
  const totalMins = dayEnd - dayStart;

  // Grid lines: every hour within the range
  const startHour = Math.ceil(dayStart / 60);
  const endHour = Math.floor(dayEnd / 60);
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  // Helper to get % position
  const getPercent = (min: number) => {
    const p = ((min - dayStart) / totalMins) * 100;
    return Math.max(0, Math.min(100, p));
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px] mt-2 px-6">
        {/* Timeline Header (Hours) */}
        <div className="relative h-6 border-b border-outline-variant/40 mb-2">
          {hours.map((h) => {
            const left = getPercent(h * 60);
            return (
              <div
                key={h}
                className="absolute top-0 flex flex-col items-center translate-x-[-50%]"
                style={{ left: `${left}%` }}
              >
                <span className="text-[10px] text-on-surface-variant font-medium whitespace-nowrap">
                  {formatHour(h)}
                </span>
                <div className="h-2 w-px bg-outline-variant/40 mt-0.5"></div>
              </div>
            );
          })}
        </div>

        {/* Timeline Track */}
        <div className="relative h-12 bg-surface-container-high rounded-md border border-outline-variant/30 overflow-hidden">
          {/* Background Grid Lines */}
          {hours.map((h) => (
            <div
              key={`grid-${h}`}
              className="absolute top-0 bottom-0 w-px bg-outline-variant/10"
              style={{ left: `${getPercent(h * 60)}%` }}
            />
          ))}

          {/* Booked Slots */}
          {bookings.map((b, i) => {
            const left = getPercent(b.start_time);
            const right = getPercent(b.end_time);
            const width = right - left;
            if (width <= 0) return null;
            return (
              <div
                key={i}
                className="absolute top-1 bottom-1 bg-primary/40 border border-primary/60 rounded-sm flex items-center justify-center overflow-hidden"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`Booked${b.label ? `: ${b.label}` : ""}`}
              >
                {b.label && (
                  <span className="text-[10px] font-bold text-white px-1 truncate">
                    {b.label}
                  </span>
                )}
              </div>
            );
          })}

          {/* Selected Slot (Pending) */}
          {selectedStart !== undefined && selectedEnd !== undefined && selectedEnd > selectedStart && (
            <div
              className={`absolute top-1 bottom-1 rounded-sm flex items-center justify-center z-10 ${
                hasClash
                  ? "bg-rose-500/80 border border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                  : "bg-emerald-500/80 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              }`}
              style={{
                left: `${getPercent(selectedStart)}%`,
                width: `${getPercent(selectedEnd) - getPercent(selectedStart)}%`,
              }}
              title={hasClash ? "Overlaps an existing booking" : "Your selection"}
            >
              <span className="text-[10px] font-bold text-white px-1 truncate">
                {hasClash ? "Clash" : "Selected"}
              </span>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-2 justify-end px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-primary/40 border border-primary/60 rounded-sm"></div>
            <span className="text-[10px] text-on-surface-variant">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500/80 border border-emerald-400 rounded-sm"></div>
            <span className="text-[10px] text-on-surface-variant">Your Selection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-rose-500/80 border border-rose-400 rounded-sm"></div>
            <span className="text-[10px] text-on-surface-variant">Overlap / Clash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
