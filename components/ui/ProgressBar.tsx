"use client";

interface ProgressBarProps {
  isLoading?: boolean;
  className?: string;
}

export default function ProgressBar({ isLoading = true, className = "" }: ProgressBarProps) {
  if (!isLoading) return null;

  return (
    <div className={`w-full h-1 bg-surface-container-high overflow-hidden relative rounded-full ${className}`}>
      <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary via-secondary to-primary w-full animate-indeterminate-progress rounded-full" />
    </div>
  );
}
