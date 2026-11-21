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
  /* Reachable without the bell (DEV-244) - the bell is a popover, and a
     resident who has dismissed it should still be able to find an update. */
  { label: "Notifications", href: "/resident/notifications", icon: "notifications" },
  { label: "Profile", href: "/resident/profile", icon: "person" },
];
