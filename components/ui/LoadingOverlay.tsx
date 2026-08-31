"use client";

import LoadingSpinner from "./LoadingSpinner";

interface LoadingOverlayProps {
  label?: string;
  sublabel?: string;
}

export default function LoadingOverlay({
  label = "Processing...",
  sublabel,
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 shadow-2xl flex flex-col items-center gap-3 text-center max-w-xs w-full">
        <LoadingSpinner size="lg" className="text-primary" />
        <div>
          <h4 className="text-sm font-bold text-white leading-tight">{label}</h4>
          {sublabel && (
            <p className="text-[11px] text-on-surface-variant mt-1">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
