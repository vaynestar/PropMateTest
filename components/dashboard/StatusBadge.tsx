type StatusBadgeProps = {
  status: string;
  variant?: "ticket" | "invoice" | "unit";
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
  Occupied: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40",
  Vacant: "bg-surface-container-highest text-on-surface-variant border-outline-variant",
  Maintenance: "bg-amber-400/20 text-amber-300 border-amber-400/40",
};

export default function StatusBadge({ status, variant = "ticket" }: StatusBadgeProps) {
  const map =
    variant === "invoice" ? invoiceStyles : variant === "unit" ? unitStyles : ticketStyles;
  const cls = map[status] ?? "bg-surface-container-highest text-on-surface-variant border-outline-variant";

  return (
    <span
      className={`px-2 py-1 rounded font-label-sm text-label-sm border ${cls}`}
    >
      {status}
    </span>
  );
}
