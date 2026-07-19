import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: string;
  icon: string;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "danger";
};

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "text-primary",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-rose-400",
};

export default function KpiCard({
  label,
  value,
  icon,
  hint,
  accent = "primary",
}: KpiCardProps) {
  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-label-md text-label-md text-on-surface-variant">
          {label}
        </span>
        <span
          className={`material-symbols-outlined ${accentMap[accent]}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="font-headline-lg text-headline-lg text-on-surface">
        {value}
      </div>
      {hint && (
        <div className="font-label-sm text-label-sm text-on-surface-variant">
          {hint}
        </div>
      )}
    </div>
  );
}
