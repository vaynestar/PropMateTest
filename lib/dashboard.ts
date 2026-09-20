import prisma from "@/lib/prisma";

export type DashboardStats = {
  totalProperties: number;
  totalFacilities: number;
  upcomingMaintenance: number;
  /** Facilities due for service soon, or already past due. */
  upcomingMaintenanceList: {
    facility_id: string;
    facility_name: string;
    facility_type: string;
    next_maintenance_date: string;
    daysAway: number;
    isOverdue: boolean;
    isClosed: boolean;
  }[];
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
  financialTrend: {
    month: string;
    invoiced: number;
    collected: number;
  }[];
  /** Infographics (DEV-194). Each is already scoped to the active property. */
  unitMix: { label: string; count: number }[];
  ticketMix: { label: string; count: number }[];
  ticketAging: { label: string; count: number }[];
  visitorTrend: { day: string; expected: number; arrived: number }[];
  topArrears: {
    invoice_id: string;
    invoice_no: string;
    unit: string;
    tenant: string;
    daysLate: number;
    amount: number;
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
    upcomingMaintenanceRows,
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
    trendInvoices,
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
    prisma.facility.findMany({
      where: {
        ...facilityWhere,
        next_maintenance_date: { lte: next30Days },
      },
      select: {
        facility_id: true,
        facility_name: true,
        facility_type: true,
        facility_status: true,
        next_maintenance_date: true,
      },
      orderBy: { next_maintenance_date: "asc" },
      take: 6,
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
            tenant: { select: { user_name: true } },
          },
        },
      },
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
    prisma.invoice.findMany({
      where: { lease: leaseWhere },
      select: {
        invoice_date: true,
        total_amount: true,
        status: true,
        transactions: {
          where: { transaction_status: { in: ["Success", "Completed"] } },
          select: { transaction_amount: true },
        },
      },
      orderBy: { invoice_date: "asc" },
    }),
  ]);

  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const outstandingAmount = Number(outstandingAgg._sum.total_amount ?? 0);
  const monthlyRevenue = Number(monthlyRevenueAgg._sum.monthly_rent ?? 0);
  const todayCollectedAmount = Number(todayPaidInvoices._sum.total_amount ?? 0);

  // Compile Financial Trend for Area/Line Chart
  const monthlyTrendMap: Record<string, { month: string; invoiced: number; collected: number }> = {};
  for (const inv of trendInvoices) {
    const d = new Date(inv.invoice_date);
    const monthKey = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    if (!monthlyTrendMap[monthKey]) {
      monthlyTrendMap[monthKey] = { month: monthKey, invoiced: 0, collected: 0 };
    }
    const invTotal = Number(inv.total_amount) || 0;
    const paidSum = inv.transactions.reduce((sum, tx) => sum + (Number(tx.transaction_amount) || 0), 0);
    const isPaid = inv.status === "Paid" || paidSum >= invTotal;
    const invCollected = isPaid ? invTotal : paidSum;

    monthlyTrendMap[monthKey].invoiced += invTotal;
    monthlyTrendMap[monthKey].collected += invCollected;
  }
  const financialTrend = Object.values(monthlyTrendMap);

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

  const maintToday = new Date();
  maintToday.setHours(0, 0, 0, 0);
  const upcomingMaintenanceList = (upcomingMaintenanceRows as any[]).map((f) => {
    const due = new Date(f.next_maintenance_date);
    due.setHours(0, 0, 0, 0);
    const daysAway = Math.round((due.getTime() - maintToday.getTime()) / 86_400_000);
    return {
      facility_id: f.facility_id,
      facility_name: f.facility_name,
      facility_type: f.facility_type,
      next_maintenance_date: due.toISOString(),
      daysAway,
      isOverdue: daysAway < 0,
      isClosed: f.facility_status === "Maintenance",
    };
  });

  // Sort activity feed newest first
  activityFeed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // ── Infographic series (DEV-194) ────────────────────────────────────────
  const OPEN_STATUSES = ["Open", "In Progress", "KIV", "Pending Parts"];
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [unitRows, ticketRows, openTicketDates, weekVisitors, arrearsRows] = await Promise.all([
    prisma.unit.groupBy({ by: ["status"], where: unitWhere, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["status"], where: ticketWhere, _count: { _all: true } }),
    prisma.ticket.findMany({
      where: { ...ticketWhere, status: { in: OPEN_STATUSES } },
      select: { created_at: true },
    }),
    prisma.visitor.findMany({
      where: { ...visitorWhere, visit_date: { gte: sevenDaysAgo } },
      select: { visit_date: true, check_in_time: true },
    }),
    prisma.invoice.findMany({
      where: {
        ...(propertyId ? { lease: { unit: { property_id: propertyId } } } : {}),
        status: "Unpaid",
        issued_at: { not: null },
        due_date: { lt: startOfToday },
      },
      select: {
        invoice_id: true,
        invoice_no: true,
        due_date: true,
        total_amount: true,
        lease: { select: { unit: { select: { unit_number: true } }, tenant: { select: { user_name: true } } } },
      },
      orderBy: { due_date: "asc" },
      take: 5,
    }),
  ]);

  const unitMix = unitRows
    .map((r) => ({ label: r.status || "Unknown", count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const ticketMix = ticketRows
    .map((r) => ({ label: r.status || "Unknown", count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  const AGE_BUCKETS: { label: string; max: number }[] = [
    { label: "Today", max: 1 },
    { label: "1-3 days", max: 4 },
    { label: "4-7 days", max: 8 },
    { label: "Over a week", max: Infinity },
  ];
  const ticketAging = AGE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  openTicketDates.forEach((t) => {
    const age = Math.floor((startOfToday.getTime() - new Date(t.created_at).setHours(0, 0, 0, 0)) / 86_400_000);
    const i = AGE_BUCKETS.findIndex((b) => age < b.max);
    ticketAging[i === -1 ? AGE_BUCKETS.length - 1 : i].count++;
  });

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const visitorTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toDateString();
    const sameDay = weekVisitors.filter((v) => v.visit_date && new Date(v.visit_date).toDateString() === key);
    return {
      day: DAY_NAMES[d.getDay()],
      expected: sameDay.length,
      arrived: sameDay.filter((v) => v.check_in_time).length,
    };
  });

  const topArrears = arrearsRows.map((inv) => ({
    invoice_id: inv.invoice_id,
    invoice_no: inv.invoice_no,
    unit: inv.lease?.unit?.unit_number ?? "-",
    tenant: inv.lease?.tenant?.user_name ?? "-",
    daysLate: Math.max(
      0,
      Math.floor((startOfToday.getTime() - new Date(inv.due_date).setHours(0, 0, 0, 0)) / 86_400_000)
    ),
    amount: Number(inv.total_amount),
  }));

  return {
    totalProperties,
    totalFacilities,
    upcomingMaintenance,
    upcomingMaintenanceList,
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
    financialTrend,
    unitMix,
    ticketMix,
    ticketAging,
    visitorTrend,
    topArrears,
  };
}
