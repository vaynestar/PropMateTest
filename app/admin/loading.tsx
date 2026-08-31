"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ProgressBar from "@/components/ui/ProgressBar";

export default function AdminLoading() {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-black/25 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Top Animated Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-[101]">
        <ProgressBar isLoading={true} />
      </div>

      {showSpinner && (
        <div className="p-4 rounded-2xl bg-surface-container-lowest/90 border border-outline-variant/60 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2">
          <LoadingSpinner size="md" className="text-primary" />
          <span className="text-[11px] font-medium text-on-surface-variant">Loading workspace...</span>
        </div>
      )}
    </div>
  );
}
