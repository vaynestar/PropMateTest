"use client";

import { useState, useMemo } from "react";

function jsDayToMonFirst(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function dateToISO(d: Date): string {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
}

interface BookingCalendarDatePickerProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateISO: string) => void;
  operationDays?: string; // "1,2,3,4,5,6,7"
  minDate?: Date;
  maxDaysCount?: number;
}

export default function BookingCalendarDatePicker({
  selectedDate,
  onSelectDate,
  operationDays = "1,2,3,4,5,6,7",
  minDate = new Date(),
  maxDaysCount = 90,
}: BookingCalendarDatePickerProps) {
  const [viewMode, setViewMode] = useState<"strip" | "calendar">("calendar");

  // Parse open weekdays set (Mon=1...Sun=7)
  const openDaysSet = useMemo(() => {
    return new Set(
      operationDays
        .split(",")
        .map((d) => Number(d.trim()))
        .filter((n) => n >= 1 && n <= 7)
    );
  }, [operationDays]);

  const today = useMemo(() => {
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate]);

  const todayISO = useMemo(() => dateToISO(today), [today]);

  const maxAllowedDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + maxDaysCount);
    return d;
  }, [today, maxDaysCount]);

  // Active Month state for Full Calendar View
  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = selectedDate ? new Date(selectedDate) : new Date(today);
    return isNaN(initial.getTime()) ? new Date(today) : new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // Next 10 open dates for quick strip view
  const openDatesStrip = useMemo(() => {
    const out: Date[] = [];
    const d = new Date(today);
    while (out.length < 10 && d <= maxAllowedDate) {
      if (openDaysSet.has(jsDayToMonFirst(d.getDay()))) {
        out.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [today, maxAllowedDate, openDaysSet]);

  // Calendar Grid Computation for currentMonth
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-first starting offset
    let startDayOfWeek = jsDayToMonFirst(firstDayOfMonth.getDay());

    const days: { date: Date; iso: string; isCurrentMonth: boolean; isDisabled: boolean; isClosed: boolean }[] = [];

    // Prepend padding days from previous month
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const prevD = new Date(year, month, 1 - i);
      const iso = dateToISO(prevD);
      days.push({
        date: prevD,
        iso,
        isCurrentMonth: false,
        isDisabled: true,
        isClosed: !openDaysSet.has(jsDayToMonFirst(prevD.getDay())),
      });
    }

    // Days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(year, month, day);
      d.setHours(0, 0, 0, 0);
      const iso = dateToISO(d);
      const isPast = d < today;
      const isFutureExceeded = d > maxAllowedDate;
      const isOpen = openDaysSet.has(jsDayToMonFirst(d.getDay()));
      const isDisabled = isPast || isFutureExceeded || !isOpen;

      days.push({
        date: d,
        iso,
        isCurrentMonth: true,
        isDisabled,
        isClosed: !isOpen,
      });
    }

    // Append padding days to complete 7-column grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextD = new Date(year, month + 1, i);
        const iso = dateToISO(nextD);
        days.push({
          date: nextD,
          iso,
          isCurrentMonth: false,
          isDisabled: true,
          isClosed: !openDaysSet.has(jsDayToMonFirst(nextD.getDay())),
        });
      }
    }

    return days;
  }, [currentMonth, today, maxAllowedDate, openDaysSet]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? null : d;
  }, [selectedDate]);

  return (
    <div className="space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
          Select Booking Date
        </label>

        <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-outline-variant/40">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              viewMode === "calendar"
                ? "bg-primary text-black shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">calendar_view_month</span>
            Calendar View
          </button>

          <button
            type="button"
            onClick={() => setViewMode("strip")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              viewMode === "strip"
                ? "bg-primary text-black shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">view_week</span>
            Quick List
          </button>
        </div>
      </div>

      {/* VIEW 1: Interactive Full Calendar View */}
      {viewMode === "calendar" && (
        <div className="glass-card rounded-2xl p-4 border border-outline-variant/50 space-y-4 animate-in fade-in duration-200">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <span className="font-title-md text-title-md text-on-surface font-bold">
              {monthLabel}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
              <span key={w} className="text-[11px] font-bold text-on-surface-variant uppercase">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item, idx) => {
              const isSelected = item.iso === selectedDate;
              const isToday = item.iso === todayISO;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => onSelectDate(item.iso)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all pressable ${
                    isSelected
                      ? "bg-primary text-black font-bold shadow-lg shadow-primary/30 ring-2 ring-primary scale-[1.05]"
                      : item.isDisabled
                      ? "opacity-30 bg-surface-container-lowest text-on-surface-variant cursor-not-allowed"
                      : "bg-surface-container-high text-on-surface hover:bg-primary/20 hover:border-primary/40 border border-transparent"
                  } ${!item.isCurrentMonth ? "opacity-20" : ""}`}
                >
                  <span className="text-xs font-semibold">{item.date.getDate()}</span>

                  {/* Badges */}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}

                  {item.isClosed && !item.isDisabled && (
                    <span className="text-[9px] text-rose-400 uppercase font-bold">Closed</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant/30">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-md bg-surface-container-lowest opacity-40 border border-outline-variant" />
              <span>Unavailable / Closed</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Quick Open Dates Strip */}
      {viewMode === "strip" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none animate-in fade-in duration-200">
          {openDatesStrip.map((d) => {
            const iso = dateToISO(d);
            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDate(iso)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-center transition-all pressable ${
                  isSelected
                    ? "bg-primary text-black font-bold border-primary shadow-md shadow-primary/20"
                    : "bg-surface-container-high border-outline-variant text-on-surface hover:border-primary/50"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-on-surface-variant">
                  {isToday ? "Today" : d.toLocaleDateString("en-MY", { weekday: "short" })}
                </div>
                <div className="text-sm font-bold mt-0.5">{d.getDate()} {d.toLocaleDateString("en-MY", { month: "short" })}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Date Summary Banner */}
      {selectedDateObj && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">event</span>
            <span className="text-xs text-on-surface font-medium">
              Selected Date:{" "}
              <strong className="text-primary font-bold">
                {selectedDateObj.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </span>
          </div>

          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            Available Slot
          </span>
        </div>
      )}
    </div>
  );
}
