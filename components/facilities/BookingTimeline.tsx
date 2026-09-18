"use client";

import React from "react";
import ScrollHint from "@/components/ui/ScrollHint";

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
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function formatClock(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

/** Wide enough per hour that labels never collide on a phone (DEV-184). */
const PX_PER_HOUR = 80;

/**
 * Day availability bar. Reworked (user, 2026-09-18: "the facilities booking
 * time is un viewable, the colour need to change"): the old bar was a faint
 * lilac on dark grey with 10px grey labels, booked slots in almost the same
 * colour as the background, and the chosen slot truncated to "Sel...".
 * Now: amber striped = taken, solid primary = your slot with its times
 * written out, rose = clash, hour labels in full-contrast text.
 */
export default function BookingTimeline({
  dayStart,
  dayEnd,
  bookings,
  selectedStart,
  selectedEnd,
  hasClash,
}: BookingTimelineProps) {
  const totalMins = Math.max(1, dayEnd - dayStart);

  const startHour = Math.ceil(dayStart / 60);
  const endHour = Math.floor(dayEnd / 60);
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  const getPercent = (min: number) => Math.max(0, Math.min(100, ((min - dayStart) / totalMins) * 100));
  const minWidth = Math.max(320, Math.ceil((totalMins / 60) * PX_PER_HOUR));

  const hasSelection = selectedStart !== undefined && selectedEnd !== undefined && selectedEnd > selectedStart;

  return (
    <div className="space-y-2">
      <ScrollHint className="w-full pb-2">
        <div className="mt-1 px-4" style={{ minWidth }}>
          {/* Hour labels */}
          <div className="relative h-6">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold text-on-surface/85 whitespace-nowrap tabular-nums"
                style={{ left: `${getPercent(h * 60)}%` }}
              >
                {formatHour(h)}
              </span>
            ))}
          </div>

          {/* Track */}
          <div className="relative h-14 rounded-lg bg-emerald-500/[0.07] border border-emerald-400/25 overflow-hidden">
            {hours.map((h) => (
              <div
                key={`grid-${h}`}
                className="absolute top-0 bottom-0 w-px bg-white/10"
                style={{ left: `${getPercent(h * 60)}%` }}
              />
            ))}

            {/* Taken */}
            {bookings.map((b, i) => {
              const left = getPercent(b.start_time);
              const width = getPercent(b.end_time) - left;
              if (width <= 0) return null;
              return (
                <div
                  key={i}
                  className="absolute top-1.5 bottom-1.5 rounded-md border border-amber-400/70 flex items-center justify-center overflow-hidden"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background:
                      "repeating-linear-gradient(135deg, rgba(251,191,36,0.32) 0 6px, rgba(251,191,36,0.16) 6px 12px)",
                  }}
                  title={`Booked ${formatClock(b.start_time)} – ${formatClock(b.end_time)}`}
                >
                  <span className="text-[11px] font-bold text-amber-100 px-1 truncate">
                    {b.label || "Booked"}
                  </span>
                </div>
              );
            })}

            {/* Your slot */}
            {hasSelection && (
              <div
                className={`absolute top-1 bottom-1 rounded-md flex items-center justify-center z-10 shadow-lg ring-2 ${
                  hasClash ? "bg-rose-500 ring-rose-300/70" : "bg-primary ring-white/40"
                }`}
                style={{
                  left: `${getPercent(selectedStart!)}%`,
                  width: `${getPercent(selectedEnd!) - getPercent(selectedStart!)}%`,
                }}
                title={hasClash ? "Overlaps an existing booking" : "Your slot"}
              >
                <span className={`text-[11px] font-bold px-1 truncate ${hasClash ? "text-white" : "text-on-primary"}`}>
                  {hasClash ? "Clash" : `${formatClock(selectedStart!)}–${formatClock(selectedEnd!)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </ScrollHint>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-on-surface/85">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500/15 border border-emerald-400/40" />
          Free
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded border border-amber-400/70"
            style={{ background: "repeating-linear-gradient(135deg, rgba(251,191,36,0.45) 0 3px, rgba(251,191,36,0.2) 3px 6px)" }}
          />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-primary" />
          Your slot
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-rose-500" />
          Clash
        </span>
      </div>
    </div>
  );
}
