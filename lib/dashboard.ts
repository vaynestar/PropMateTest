import prisma from "@/lib/prisma";

export type DashboardStats = {
  totalProperties: number;
  totalFacilities: number;
  upcomingMaintenance: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  occupancyRate: number;
  totalInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  outstandingAmount: number;
  monthlyRevenue: number;
  todayCollectedAmount: number;
  openTickets: number;
  urgentTicketsCount: number;
  severeOverdueCount: number;
  expiringLeasesCount: number;
  activeVisitorsCount: number;
  totalTenants: number;
  urgentActionItems: {
    id: string;
    type: "TICKET" | "OVERDUE" | "LEASE_EXPIRY";
    title: string;
    subtitle: string;
    urgency: "CRITICAL" | "HIGH" | "MEDIUM";
    href: string;
    timestamp: Date | string;
  }[];
  activityFeed: {
    id: string;
    type: "VISITOR" | "TICKET" | "PAYMENT" | "ANNOUNCEMENT";
    title: string;
    detail: string;
    badge?: string;
    timestamp: Date;
  }[];
  openTicketsList: {
    ticket_id: string;
    title: string;
    status: string;
    priority: string;
    created_at: Date;
    ticket_category: string;
  }[];
};

export async function getDashboardStats(propertyId?: string): Promise<DashboardStats> {
  const now = new Date();
  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const facilityWhere = propertyId ? { property_id: propertyId } : {};
  const unitWhere = propertyId ? { property_id: propertyId } : {};
  const leaseWhere = propertyId ? { unit: { property_id: propertyId } } : {};
  const ticketWhere = propertyId ? { lease: { unit: { property_id: propertyId } } } : {};
  const visitorWhere = propertyId
    ? {
        OR: [
          { property_id: propertyId },
          { lease: { unit: { property_id: propertyId } } },
        ],
      }
    : {};

  const [
    totalProperties,
    totalFacilities,
    upcomingMaintenance,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    totalInvoices,
    unpaidInvoices,
    overdueInvoices,
    outstandingAgg,
    monthlyRevenueAgg,
    todayPaidInvoices,
    openTicketsCount,
    urgentTickets,
    expiringLeases,
    severeOverdueInvoices,
    activeVisitorsCount,
    totalTenants,
    recentVisitors,
    recentTickets,
    recentPaidInvoices,
    recentAnnouncements,
    openTicketsList,
  ] = await Promise.all([
    prisma.propertyMaster.count(),
    prisma.facility.count({ where: facilityWhere }),
    prisma.facility.count({
      where: {
        ...facilityWhere,
        next_maintenance_date: {
          lte: next30Days,
          gte: now,
        },
      },
    }),
    prisma.unit.count({ where: unitWhere }),
    prisma.unit.count({ where: { ...unitWhere, status: "Occupied" } }),
    prisma.unit.count({ where: { ...unitWhere, status: "Vacant" } }),
    prisma.unit.count({ where: { ...unitWhere, status: "Maintenance" } }),
    prisma.invoice.count({ where: { lease: leaseWhere } }),
    prisma.invoice.count({ where: { status: "Unpaid", lease: leaseWhere } }),
    prisma.invoice.count({ where: { status: "Overdue", lease: leaseWhere } }),
    prisma.invoice.aggregate({
      _sum: { total_amount: true },
      where: { status: { not: "Paid" }, lease: leaseWhere },
    }),
    prisma.unit.aggregate({
      _sum: { monthly_rent: true },
      where: { ...unitWhere, status: "Occupied" },
    }),
    prisma.invoice.aggregate({
      _sum: { total_amount: true },
      where: {
        status: "Paid",
        lease: leaseWhere,
        modified_at: { gte: startOfToday },
      },
    }),
    prisma.ticket.count({ where: { ...ticketWhere, status: { in: ["Open", "In Progress"] } } }),
    prisma.ticket.findMany({
      where: {
        ...ticketWhere,
        priority: { in: ["Urgent", "High"] },
        status: { in: ["Open", "In Progress"] },
      },
      include: {
        lease: {
          include: {
            unit: { select: { unit_number: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 5,
    }),
    prisma.tenantLease.findMany({
      where: {
        ...leaseWhere,
        status: "Active",
        move_out_date: { lte: next30Days, gte: now },
      },
      include: {
        unit: { select: { unit_number: true } },
        tenant: { select: { user_name: true } },
      },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        status: "Overdue",
        lease: leaseWhere,
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
    }),
    prisma.visitor.count({
      where: {
        ...visitorWhere,
        check_in_time: { not: null },
        check_out_time: null,
      },
    }),
    prisma.user.count({
      where: {
        role: "Resident",
        tenant_leases: propertyId ? { some: { unit: { property_id: propertyId } } } : undefined,
      },
    }),
    prisma.visitor.findMany({
      where: {
        ...visitorWhere,
        check_in_time: { not: null },
      },
      orderBy: { check_in_time: "desc" },
      take: 6,
      include: {
        lease: { include: { unit: { select: { unit_number: true } } } },
      },
    }),
    prisma.ticket.findMany({
      where: ticketWhere,
      orderBy: { created_at: "desc" },
      take: 6,
      include: {
        lease: { include: { unit: { select: { unit_number: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: { status: "Paid", lease: leaseWhere },
      orderBy: { modified_at: "desc" },
      take: 6,
      include: {
        lease: { include: { unit: { select: { unit_number: true } }, tenant: { select: { user_name: true } } } },
      },
    }),
    prisma.announcement.findMany({
      where: propertyId ? { property_id: propertyId } : {},
      orderBy: { created_at: "desc" },
      take: 4,
    }),
    prisma.ticket.findMany({
      where: { ...ticketWhere, status: { in: ["Open", "In Progress"] } },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        ticket_id: true,
        title: true,
        status: true,
        priority: true,
        created_at: true,
        ticket_category: true,
      },
    }),
  ]);

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const outstandingAmount = Number(outstandingAgg._sum.total_amount ?? 0);
  const monthlyRevenue = Number(monthlyRevenueAgg._sum.monthly_rent ?? 0);
  const todayCollectedAmount = Number(todayPaidInvoices._sum.total_amount ?? 0);

  // Compile Urgent Action Items
  const urgentActionItems: DashboardStats["urgentActionItems"] = [];

  urgentTickets.forEach((t) => {
    urgentActionItems.push({
      id: t.ticket_id,
      type: "TICKET",
      title: `Urgent Ticket: ${t.title}`,
      subtitle: `Unit ${t.lease?.unit?.unit_number || "General"} • Logged ${t.created_at.toLocaleDateString()}`,
      urgency: t.priority === "Urgent" ? "CRITICAL" : "HIGH",
      href: "/admin/maintenance",
      timestamp: t.created_at,
    });
  });

  severeOverdueInvoices.forEach((inv) => {
    urgentActionItems.push({
      id: inv.invoice_id,
      type: "OVERDUE",
      title: `Overdue Invoice: RM ${Number(inv.total_amount).toFixed(2)}`,
      subtitle: `Unit ${inv.lease.unit.unit_number} (${inv.lease.tenant.user_name}) • Due ${new Date(inv.due_date).toLocaleDateString()}`,
      urgency: "HIGH",
      href: "/admin/invoices",
      timestamp: inv.due_date,
    });
  });

  expiringLeases.forEach((l) => {
    const expiryDate = l.move_out_date ? new Date(l.move_out_date) : new Date();
    urgentActionItems.push({
      id: l.lease_id,
      type: "LEASE_EXPIRY",
      title: `Lease Expiring: Unit ${l.unit.unit_number}`,
      subtitle: `Tenant ${l.tenant.user_name} • Ends ${expiryDate.toLocaleDateString()}`,
      urgency: "MEDIUM",
      href: "/admin/leases",
      timestamp: expiryDate,
    });
  });

  // Compile Live Activity Feed
  const activityFeed: DashboardStats["activityFeed"] = [];

  recentVisitors.forEach((v) => {
    if (v.check_in_time) {
      activityFeed.push({
        id: `vis-${v.visitor_id}`,
        type: "VISITOR",
        title: `Visitor Checked In: ${v.visitor_name}`,
        detail: `To Unit ${v.lease?.unit?.unit_number || "Property"} • ${v.vehicle_plate || "Pedestrian"}`,
        badge: v.visitor_type || "Guest",
        timestamp: new Date(v.check_in_time),
      });
    }
  });

  recentTickets.forEach((t) => {
    activityFeed.push({
      id: `tkt-${t.ticket_id}`,
      type: "TICKET",
      title: `Helpdesk Ticket Lodged`,
      detail: `${t.title} • Unit ${t.lease?.unit?.unit_number || "General"}`,
      badge: t.priority,
      timestamp: new Date(t.created_at),
    });
  });

  recentPaidInvoices.forEach((inv) => {
    activityFeed.push({
      id: `inv-${inv.invoice_id}`,
      type: "PAYMENT",
      title: `Payment Received: RM ${Number(inv.total_amount).toFixed(2)}`,
      detail: `Unit ${inv.lease.unit.unit_number} (${inv.lease.tenant.user_name})`,
      badge: "Paid",
      timestamp: new Date(inv.modified_at || inv.created_at),
    });
  });

  recentAnnouncements.forEach((a) => {
    activityFeed.push({
      id: `ann-${a.announcement_id}`,
      type: "ANNOUNCEMENT",
      title: `Announcement Published`,
      detail: a.title,
      badge: a.category || "General",
      timestamp: new Date(a.created_at),
    });
  });

  // Sort activity feed newest first
  activityFeed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    totalProperties,
    totalFacilities,
    upcomingMaintenance,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    occupancyRate,
    totalInvoices,
    unpaidInvoices,
    overdueInvoices,
    outstandingAmount,
    monthlyRevenue,
    todayCollectedAmount,
    openTickets: openTicketsCount,
    urgentTicketsCount: urgentTickets.length,
    severeOverdueCount: severeOverdueInvoices.length,
    expiringLeasesCount: expiringLeases.length,
    activeVisitorsCount,
    totalTenants,
    urgentActionItems,
    activityFeed: activityFeed.slice(0, 10),
    openTicketsList,
  };
}
