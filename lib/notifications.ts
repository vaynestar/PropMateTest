import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export type NotificationItem = {
  id: string;
  type: "TICKET" | "VISITOR" | "BILLING" | "BOOKING" | "SYSTEM";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  href: string;
  urgency?: "CRITICAL" | "HIGH" | "NORMAL" | "INFO";
};

export async function getAdminNotifications(): Promise<NotificationItem[]> {
  const user = await getSessionUser();
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const notifications: NotificationItem[] = [];

  try {
    // 1. Dynamic Urgent Tickets
    const urgentTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ["Open", "In Progress"] },
        priority: { in: ["Urgent", "High"] },
      },
      include: {
        lease: { include: { unit: { select: { unit_number: true } } } },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    urgentTickets.forEach((t) => {
      notifications.push({
        id: `tkt-${t.ticket_id}`,
        type: "TICKET",
        title: `${t.priority} Ticket: ${t.title}`,
        message: `Unit ${t.lease?.unit?.unit_number || "Common Area"} • Requires technician assignment`,
        timestamp: t.created_at,
        isRead: false,
        href: "/admin/maintenance",
        urgency: t.priority === "Urgent" ? "CRITICAL" : "HIGH",
      });
    });

    // 2. Overstay / Active Visitors
    const overstayVisitors = await prisma.visitor.findMany({
      where: {
        check_in_time: { lte: twelveHoursAgo },
        check_out_time: null,
      },
      include: {
        lease: { include: { unit: { select: { unit_number: true } } } },
      },
      take: 5,
    });

    overstayVisitors.forEach((v) => {
      notifications.push({
        id: `vis-${v.visitor_id}`,
        type: "VISITOR",
        title: `Overstay Warning: ${v.visitor_name}`,
        message: `Visiting Unit ${v.lease?.unit?.unit_number || "Premises"} (>12h on-site)`,
        timestamp: v.check_in_time || now,
        isRead: false,
        href: "/admin/visitors",
        urgency: "HIGH",
      });
    });

    // 3. Pending Facility Bookings
    const pendingBookings = await prisma.booking.findMany({
      where: {
        booking_status: "Pending",
      },
      include: {
        facility: { select: { facility_name: true } },
        lease: { include: { tenant: { select: { user_name: true } } } },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    pendingBookings.forEach((b) => {
      notifications.push({
        id: `book-${b.booking_id}`,
        type: "BOOKING",
        title: `Booking Request: ${b.facility.facility_name}`,
        message: `Requested by ${b.lease?.tenant?.user_name || "Resident"} for ${new Date(b.booking_date).toLocaleDateString()}`,
        timestamp: b.created_at,
        isRead: false,
        href: "/admin/bookings",
        urgency: "NORMAL",
      });
    });

    // 4. Overdue Invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "Overdue",
      },
      include: {
        lease: {
          include: {
            unit: { select: { unit_number: true } },
            tenant: { select: { user_name: true } },
          },
        },
      },
      orderBy: { due_date: "asc" },
      take: 5,
    });

    overdueInvoices.forEach((inv) => {
      notifications.push({
        id: `inv-${inv.invoice_id}`,
        type: "BILLING",
        title: `Overdue Invoice: RM ${Number(inv.total_amount).toFixed(2)}`,
        message: `Unit ${inv.lease.unit.unit_number} (${inv.lease.tenant.user_name}) past due`,
        timestamp: inv.due_date,
        isRead: false,
        href: "/admin/invoices",
        urgency: "HIGH",
      });
    });

    // 5. Database Notifications for the current user
    if (user?.userId) {
      const dbNotifs = await prisma.notification.findMany({
        where: { user_id: user.userId },
        orderBy: { created_at: "desc" },
        take: 10,
      });

      dbNotifs.forEach((n) => {
        notifications.push({
          id: `db-${n.notification_id}`,
          type: "SYSTEM",
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          isRead: n.is_read,
          href: "/admin",
          urgency: "INFO",
        });
      });
    }
  } catch (err) {
    console.error("Error generating admin notifications:", err);
  }

  // Sort by timestamp newest first
  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
}
