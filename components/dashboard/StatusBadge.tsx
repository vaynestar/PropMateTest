type StatusBadgeProps = {
  status: string;
  variant?: "ticket" | "invoice" | "unit" | "lease";
};

const ticketStyles: Record<string, string> = {
  Open: "bg-amber-400/20 text-amber-300 border-amber-400/40",
  "In Progress": "bg-primary/20 text-primary border-primary/40",
  Resolved: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
  Closed: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
};

const invoiceStyles: Record<string, string> = {
  Paid: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
  Unpaid: "bg-rose-400/20 text-rose-300 border-rose-400/40",
  Overdue: "bg-rose-500/30 text-rose-200 border-rose-500/50",
  Partial: "bg-amber-400/20 text-amber-300 border-amber-400/40",
};

const unitStyles: Record<string, string> = {
  Occupied: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold",
  Vacant: "bg-sky-500/15 text-sky-300 border-sky-500/30 font-medium",
  Maintenance: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold",
  Repair: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold",
  "Not Available": "bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold",
};

const leaseStyles: Record<string, { cls: string; icon: string }> = {
  Active: {
    cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold",
    icon: "check_circle",
  },
  Inactive: {
    cls: "bg-slate-500/30 text-slate-300 border-slate-500/60 font-semibold",
    icon: "do_not_disturb_on",
  },
  Expired: {
    cls: "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold",
    icon: "history",
  },
  Terminated: {
    cls: "bg-rose-500/25 text-rose-300 border-rose-500/50 font-semibold",
    icon: "cancel",
  },
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  if (variant === "lease" || leaseStyles[status]) {
    const info = leaseStyles[status] || {
      cls: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
      icon: "info",
    };
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs border flex items-center gap-1.5 ${info.cls}`}>
        <span className="material-symbols-outlined text-[15px]">{info.icon}</span>
        {status}
      </span>
    );
  }

  const map = variant === "invoice" ? invoiceStyles : variant === "unit" ? unitStyles : ticketStyles;
  const cls = map[status] ?? "bg-surface-container-highest text-on-surface-variant border-outline-variant";

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs border font-medium ${cls}`}>
      {status}
    </span>
  );
}
