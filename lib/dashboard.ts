import prisma from "@/lib/prisma";

export type DashboardStats = {
  totalProperties: number;
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
  recentInvoices: {
    invoice_id: string;
    invoice_no: string;
    total_amount: number;
    status: string;
    due_date: Date;
  }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    totalInvoices,
    unpaidInvoices,
    overdueInvoices,
    outstandingAgg,
    monthlyRevenueAgg,
    openTickets,
    totalTenants,
    recentTickets,
    recentInvoices,
  ] = await Promise.all([
    prisma.propertyMaster.count(),
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
    prisma.ticket.count({ where: { status: { not: "Closed" } } }),
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
    prisma.invoice.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        invoice_id: true,
        invoice_no: true,
        total_amount: true,
        status: true,
        due_date: true,
      },
    }),
  ]);

  const occupancyRate =
    totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const outstandingAmount = Number(outstandingAgg._sum.total_amount ?? 0);
  const monthlyRevenue = Number(monthlyRevenueAgg._sum.monthly_rent ?? 0);

  const recentInvoicesTyped = recentInvoices.map((inv) => ({
    ...inv,
    total_amount: Number(inv.total_amount),
  }));

  return {
    totalProperties,
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
    openTickets,
    totalTenants,
    recentTickets,
    recentInvoices: recentInvoicesTyped,
  };
}
