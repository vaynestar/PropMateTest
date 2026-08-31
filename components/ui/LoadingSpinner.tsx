"use client";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  className?: string;
  fullHeight?: boolean;
}

const SIZE_MAP = {
  xs: "text-[14px]",
  sm: "text-[18px]",
  md: "text-[24px]",
  lg: "text-[36px]",
  xl: "text-[48px]",
};

export default function LoadingSpinner({
  size = "md",
  label,
  className = "text-primary",
  fullHeight = false,
}: LoadingSpinnerProps) {
  const iconSizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  const content = (
    <div className="flex flex-col items-center justify-center gap-2">
      <span className={`material-symbols-outlined animate-spin ${iconSizeClass} ${className}`}>
        progress_activity
      </span>
      {label && (
        <span className="text-xs text-on-surface-variant font-medium animate-pulse">
          {label}
        </span>
      )}
    </div>
  );

  if (fullHeight) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] w-full">
        {content}
      </div>
    );
  }

  return content;
}
