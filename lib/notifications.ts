import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export type NotificationItem = {
  id: string;
  type: "TICKET" | "VISITOR" | "BILLING" | "BOOKING" | "NOTICE" | "SYSTEM";
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

    /*
     * A "Pending Facility Bookings" section stood here. Booking approval was
     * removed in DEV-146 - a booking is Confirmed when made - so no row has
     * been Pending since, and this branch could never produce anything.
     */

    // 4. Overdue Invoices
    /*
     * This queried `status: "Overdue"`. Nothing ever writes that status -
     * overdue is *derived*: unpaid and past its due date (DEV-139). So with 33
     * invoices overdue, the admin bell's overdue section had never fired once.
     */
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "Unpaid",
        due_date: { lt: now },
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
        message: `Unit ${inv.lease.unit.unit_number} (${inv.lease.tenant.user_name}) · ${daysSince(inv.due_date)} days late`,
        timestamp: inv.due_date,
        isRead: false,
        // To the tenancy, not the whole list (DEV-164).
        href: `/admin/invoices?lease=${inv.lease_id}`,
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

function daysSince(date: Date) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

function shortDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

/**
 * What a resident should be told about, without having to go and look.
 *
 * There was no resident feed at all - only getAdminNotifications - and the bell
 * in the resident header was a button with no handler. Every loop that starts
 * with a resident ran one way: raise a ticket, and nothing says when it is
 * fixed; the same for an invoice, a booking, a notice, a guest at the gate.
 * They could see each of these by opening the right page. Nothing told them to.
 *
 * Derived from the records, like the admin feed - the `notifications` table
 * has no writer, and a feed that depends on every action remembering to write
 * a row is one missed call away from lying. Ids are stable (`tkt-<id>` etc.)
 * so read state can be kept per device.
 *
 * Invoices follow getResidentInvoices exactly, Drafts included, so the bell and
 * the Invoices page never disagree. Whether residents should see Drafts is F7.
 */
export async function getResidentNotifications(): Promise<NotificationItem[]> {
  const user = await getSessionUser();
  if (!user?.userId || user.role !== "Resident") return [];
  return getResidentNotificationsFor(user.userId);
}

/** The feed for one resident. Split out so it can be exercised without a session. */
export async function getResidentNotificationsFor(userId: string): Promise<NotificationItem[]> {
  const user = { userId };
  const now = new Date();
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000);
  const items: NotificationItem[] = [];

  try {
    const leases = await prisma.tenantLease.findMany({
      where: { user_id: user.userId, status: "Active" },
      select: { lease_id: true, unit: { select: { property_id: true } } },
    });
    const leaseIds = leases.map((l) => l.lease_id);
    const propertyIds = Array.from(new Set(leases.map((l) => l.unit.property_id)));

    // 1. Tickets they raised that have been dealt with
    const resolved = await prisma.ticket.findMany({
      where: {
        OR: [{ requester_id: user.userId }, { lease_id: { in: leaseIds } }],
        status: { in: ["Resolved", "Closed"] },
        resolved_at: { gte: days(14) },
      },
      orderBy: { resolved_at: "desc" },
      take: 5,
    });
    resolved.forEach((t) => {
      items.push({
        id: `tkt-${t.ticket_id}-${t.status}`,
        type: "TICKET",
        title: `Ticket ${t.status.toLowerCase()}: ${t.title}`,
        message: t.remark?.trim() || "Open Helpdesk to see what was done.",
        timestamp: t.resolved_at ?? now,
        isRead: false,
        href: "/resident/maintenance",
        urgency: "INFO",
      });
    });

    if (leaseIds.length > 0) {
      // 2. Money: overdue first, then anything new this month
      const unpaid = await prisma.invoice.findMany({
        where: { lease_id: { in: leaseIds }, status: "Unpaid" },
        orderBy: { due_date: "asc" },
        take: 10,
      });
      unpaid.forEach((inv) => {
        const amount = `RM ${Number(inv.total_amount).toFixed(2)}`;
        if (inv.due_date < now) {
          items.push({
            id: `inv-${inv.invoice_id}-overdue`,
            type: "BILLING",
            title: `Overdue: ${amount}`,
            message: `${inv.invoice_no} was due ${shortDate(inv.due_date)} · ${daysSince(inv.due_date)} days late`,
            timestamp: inv.due_date,
            isRead: false,
            href: "/resident/invoices",
            urgency: "HIGH",
          });
        } else if (inv.invoice_date >= days(30)) {
          items.push({
            id: `inv-${inv.invoice_id}-new`,
            type: "BILLING",
            title: `New invoice: ${amount}`,
            message: `${inv.invoice_no} · due ${shortDate(inv.due_date)}`,
            timestamp: inv.invoice_date,
            isRead: false,
            href: "/resident/invoices",
            urgency: "NORMAL",
          });
        }
      });

      // 3. Their bookings in the next two days
      const soon = await prisma.booking.findMany({
        where: {
          lease_id: { in: leaseIds },
          booking_status: "Confirmed",
          booking_date: { gte: days(1), lte: new Date(now.getTime() + 2 * 86_400_000) },
        },
        include: { facility: { select: { facility_name: true } } },
        orderBy: { booking_date: "asc" },
        take: 5,
      });
      soon
        .filter((b) => new Date(b.end_time) > now)
        .forEach((b) => {
          const t = (d: Date) =>
            new Date(d).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kuala_Lumpur",
            });
          items.push({
            id: `book-${b.booking_id}`,
            type: "BOOKING",
            title: `Coming up: ${b.facility.facility_name}`,
            message: `${shortDate(b.booking_date)}, ${t(b.start_time)}–${t(b.end_time)}`,
            timestamp: b.created_at,
            isRead: false,
            href: "/resident/facilities",
            urgency: "NORMAL",
          });
        });

      // 4. A guest of theirs has arrived
      const arrived = await prisma.visitor.findMany({
        where: {
          lease_id: { in: leaseIds },
          status: "Checked In",
          check_in_time: { gte: new Date(now.getTime() - 12 * 3_600_000) },
        },
        orderBy: { check_in_time: "desc" },
        take: 5,
      });
      arrived.forEach((v) => {
        items.push({
          id: `vis-${v.visitor_id}-in`,
          type: "VISITOR",
          title: `Your guest has arrived: ${v.visitor_name}`,
          message: v.vehicle_plate
            ? `Checked in at the gate · ${v.vehicle_plate}`
            : "Checked in at the gate",
          timestamp: v.check_in_time ?? now,
          isRead: false,
          href: "/resident/visitors",
          urgency: "INFO",
        });
      });
    }

    // 5. Notices that went up this week - the same rule the notice board uses
    if (propertyIds.length > 0) {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const notices = await prisma.announcement.findMany({
        where: {
          OR: [{ property_id: { in: propertyIds } }, { property_id: null }],
          status: "Published",
          publish_date: { lte: today, gte: days(7) },
          expiry_date: { gte: today },
        },
        orderBy: { publish_date: "desc" },
        take: 5,
      });
      notices.forEach((a) => {
        const urgent = a.priority === "Urgent" || a.priority === "High";
        items.push({
          id: `ann-${a.announcement_id}`,
          type: "NOTICE",
          title: urgent ? `Important notice: ${a.title}` : `New notice: ${a.title}`,
          message: a.category,
          timestamp: a.publish_date,
          isRead: false,
          href: "/resident/announcements",
          urgency: urgent ? "HIGH" : "INFO",
        });
      });
    }
  } catch (err) {
    console.error("Error generating resident notifications:", err);
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
}
