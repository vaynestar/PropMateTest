"use client";

interface BookingResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "success" | "error";
  title?: string;
  message: string;
  facilityName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export default function BookingResultModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  facilityName,
  date,
  startTime,
  endTime,
}: BookingResultModalProps) {
  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`glass-card rounded-3xl max-w-md w-full p-6 text-center space-y-5 border shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden ${
          isSuccess
            ? "border-emerald-500/40 bg-surface-container-high/95"
            : "border-rose-500/40 bg-surface-container-high/95"
        }`}
      >
        {/* Glow accent top bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isSuccess ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
          }`}
        />

        {/* Header Icon */}
        <div className="pt-2">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border shadow-inner ${
              isSuccess
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-rose-500/20 text-rose-400 border-rose-500/40"
            }`}
          >
            <span className="material-symbols-outlined text-[36px]">
              {isSuccess ? "check_circle" : "warning"}
            </span>
          </div>
        </div>

        {/* Modal Title */}
        <div className="space-y-1">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            {title || (isSuccess ? "Booking confirmed" : "Could not book that slot")}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Booking Details Summary Card */}
        {(facilityName || date || startTime) && (
          <div className="p-4 rounded-2xl bg-surface-container-highest/60 border border-outline-variant/40 space-y-2 text-left text-xs">
            {facilityName && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Facility</span>
                <span className="font-bold text-on-surface">{facilityName}</span>
              </div>
            )}

            {date && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant font-medium">Date</span>
                <span className="font-mono font-bold text-primary">{date}</span>
              </div>
            )}

            {(startTime || endTime) && (
              <div className="flex justify-between items-center pt-1 border-t border-outline-variant/30">
                <span className="text-on-surface-variant font-medium">Time Slot</span>
                <span className="font-mono font-bold text-emerald-400">
                  {startTime} {endTime ? `– ${endTime}` : ""}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all pressable shadow-md ${
            isSuccess
              ? "bg-emerald-500 text-black hover:bg-emerald-400"
              : "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white"
          }`}
        >
          {isSuccess ? "Done" : "Back"}
        </button>
      </div>
    </div>
  );
}
