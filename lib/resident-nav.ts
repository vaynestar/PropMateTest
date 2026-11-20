export type ResidentNavItem = {
  label: string;
  href: string;
  icon: string;
};

/*
 * The desktop sidebar. Labels match the phone bar (ResidentLayout) word for
 * word - they disagreed before, with "Dashboard" here and "Home" there, so the
 * same page had two names depending on the width of the screen.
 */
export const residentNav: ResidentNavItem[] = [
  { label: "Home", href: "/resident", icon: "dashboard" },
  { label: "Notices", href: "/resident/announcements", icon: "campaign" },
  { label: "Visitors", href: "/resident/visitors", icon: "person_search" },
  { label: "Bills", href: "/resident/invoices", icon: "receipt_long" },
  { label: "Book", href: "/resident/facilities", icon: "meeting_room" },
  { label: "Repairs", href: "/resident/maintenance", icon: "build" },
  { label: "My Unit", href: "/resident/unit", icon: "apartment" },
  { label: "Profile", href: "/resident/profile", icon: "person" },
];
