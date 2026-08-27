export type ResidentNavItem = {
  label: string;
  href: string;
  icon: string;
};

export const residentNav: ResidentNavItem[] = [
  { label: "Dashboard", href: "/resident", icon: "dashboard" },
  { label: "Notice Board", href: "/resident/announcements", icon: "campaign" },
  { label: "Visitors", href: "/resident/visitors", icon: "person_search" },
  { label: "Invoices", href: "/resident/invoices", icon: "receipt_long" },
  { label: "Facilities", href: "/resident/facilities", icon: "meeting_room" },
  { label: "Helpdesk", href: "/resident/maintenance", icon: "build" },
  { label: "My Unit", href: "/resident/unit", icon: "apartment" },
  { label: "Profile", href: "/resident/profile", icon: "person" },
];
