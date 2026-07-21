export type NavChild = {
  label: string;
  href: string;
};

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  children?: NavChild[];
};

export const adminNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "dashboard",
  },
  {
    label: "Properties",
    href: "/admin/properties",
    icon: "domain",
    children: [
      { label: "Units", href: "/admin/units" },
      { label: "Leases", href: "/admin/leases" },
    ],
  },
  {
    label: "Billing",
    href: "/admin/billing",
    icon: "payments",
    children: [
      { label: "Invoice Details", href: "/admin/invoices" },
      { label: "Recurring Charges", href: "/admin/billing/recurring-charges" }
    ],
  },
  {
    label: "Facilities",
    href: "/admin/facilities",
    icon: "apartment",
    children: [{ label: "Bookings", href: "/admin/bookings" }],
  },
  {
    label: "Helpdesk",
    href: "/admin/maintenance",
    icon: "support_agent",
  },
  {
    label: "Visitors",
    href: "/admin/visitors",
    icon: "person_search",
  },
  {
    label: "Announcements",
    href: "/admin/announcements",
    icon: "campaign",
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "analytics",
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "settings",
  },
];
