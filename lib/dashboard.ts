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
  openTickets: number;
  totalTenants: number;
  recentTickets: {
    ticket_id: string;
    title: string;
    status: string;
    priority: string;
    created_at: Date;
  }[];
  openTicketsList: {
    ticket_id: string;
    title: string;
    status: string;
    priority: string;
    created_at: Date;
    ticket_category: string;
  }[];
  maintenanceCosts: {
    month: string;
    cost: number;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

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
    openTicketsCount,
    totalTenants,
    recentTickets,
    openTicketsList,
    closedTickets,
  ] = await Promise.all([
    prisma.propertyMaster.count(),
    prisma.facility.count(),
    prisma.facility.count({
      where: {
        next_maintenance_date: {
          lte: nextMonth,
          gte: new Date(),
        },
      },
    }),
    prisma.unit.count(),
    prisma.unit.count({ where: { status: "Occupied" } }),
    prisma.unit.count({ where: { status: "Vacant" } }),
    prisma.unit.count({ where: { status: "Maintenance" } }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: "Unpaid" } }),
    prisma.invoice.count({ where: { status: "Overdue" } }),
    prisma.invoice.aggregate({
      _sum: { total_amount: true },
      where: { status: { not: "Paid" } },
    }),
    prisma.unit.aggregate({
      _sum: { monthly_rent: true },
      where: { status: "Occupied" },
    }),
    prisma.ticket.count({ where: { status: { in: ["Open", "In Progress"] } } }),
    prisma.user.count({ where: { role: "Resident" } }),
    prisma.ticket.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        ticket_id: true,
        title: true,
        status: true,
        priority: true,
        created_at: true,
      },
    }),
    prisma.ticket.findMany({
      where: { status: { in: ["Open", "In Progress"] } },
      orderBy: { created_at: "desc" },
      select: {
        ticket_id: true,
        title: true,
        status: true,
        priority: true,
        created_at: true,
        ticket_category: true,
      },
    }),
    prisma.ticket.findMany({
      where: { 
        status: { in: ["Resolved", "Closed"] },
        cost: { gt: 0 } 
      },
      select: {
        cost: true,
        resolved_at: true,
      }
    }),
  ]);

  const occupancyRate =
    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const outstandingAmount = Number(outstandingAgg._sum.total_amount ?? 0);
  const monthlyRevenue = Number(monthlyRevenueAgg._sum.monthly_rent ?? 0);

  // Group costs by month (last 6 months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const costMap: Record<string, number> = {};
  
  // Initialize last 6 months to 0
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${monthNames[past.getMonth()]} ${past.getFullYear()}`;
    costMap[key] = 0;
  }

  for (const t of closedTickets) {
    if (t.resolved_at) {
      const key = `${monthNames[t.resolved_at.getMonth()]} ${t.resolved_at.getFullYear()}`;
      if (costMap[key] !== undefined) {
        costMap[key] += Number(t.cost ?? 0);
      }
    }
  }

  const maintenanceCosts = Object.keys(costMap).map(k => ({
    month: k,
    cost: costMap[k],
  }));

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
    openTickets: openTicketsCount,
    totalTenants,
    recentTickets,
    openTicketsList,
    maintenanceCosts,
  };
}
