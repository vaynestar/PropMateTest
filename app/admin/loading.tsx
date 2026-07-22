"use client";

import { useEffect, useState } from "react";

export default function AdminLoading() {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Only show full indicator if loading takes longer than 400ms to prevent flashing on fast transitions
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-start pt-20 bg-black/20 backdrop-blur-[2px] animate-fade-in">
      {/* Top Progress Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-400 to-primary animate-pulse z-[101]" />

      {showSpinner && (
        <div className="bg-surface-container-high/90 border border-outline-variant/50 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <span className="material-symbols-outlined text-primary text-[22px] animate-spin">
            progress_activity
          </span>
          <span className="text-xs font-semibold text-on-surface tracking-wide">
            Loading PropMate...
          </span>
        </div>
      )}
    </div>
  );
}
