export type ResidentNavItem = {
  label: string;
  href: string;
  icon: string;
};

export const residentNav: ResidentNavItem[] = [
  { label: "Dashboard", href: "/resident", icon: "dashboard" },
  { label: "My Unit", href: "/resident/unit", icon: "apartment" },
  { label: "Invoices", href: "/resident/invoices", icon: "receipt_long" },
  { label: "Maintenance", href: "/resident/maintenance", icon: "build" },
];
