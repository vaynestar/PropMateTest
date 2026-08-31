import prisma from "@/lib/prisma";

export type DateRangeKey = "30d" | "quarter" | "ytd" | "all";

export function getDateRangeBoundary(dateRange: DateRangeKey): Date | null {
  const now = new Date();
  if (dateRange === "30d") {
    const d = new Date();
    d.setDate(now.getDate() - 30);
    return d;
  }
  if (dateRange === "quarter") {
    const d = new Date();
    d.setDate(now.getDate() - 90);
    return d;
  }
  if (dateRange === "ytd") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

export async function getReportsData(propertyId: string = "ALL", dateRange: DateRangeKey = "ytd") {
  const startDate = getDateRangeBoundary(dateRange);

  // Property filter predicate helpers
  const propertyWhere = propertyId !== "ALL" ? { property_id: propertyId } : {};
  const leasePropertyWhere = propertyId !== "ALL" ? { lease: { unit: { property_id: propertyId } } } : {};
  const ticketPropertyWhere = propertyId !== "ALL"
    ? {
        OR: [
          { property_id: propertyId },
          { unit: { property_id: propertyId } },
          { lease: { unit: { property_id: propertyId } } },
        ],
      }
    : {};
  const bookingPropertyWhere = propertyId !== "ALL"
    ? { facility: { property_id: propertyId } }
    : {};
  const visitorPropertyWhere = propertyId !== "ALL"
    ? {
        OR: [
          { property_id: propertyId },
          { lease: { unit: { property_id: propertyId } } },
        ],
      }
    : {};

  // -------------------------------------------------------------
  // 1. PROPERTIES & UNITS (Occupancy Analytics)
  // -------------------------------------------------------------
  const [properties, allUnits] = await Promise.all([
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true },
      orderBy: { property_name: "asc" },
    }),
    prisma.unit.findMany({
      where: propertyWhere,
      select: {
        unit_id: true,
        unit_number: true,
        status: true,
        monthly_rent: true,
        property_id: true,
        property: { select: { property_name: true } },
        leases: {
          where: { status: "Active" },
          select: { lease_id: true, tenant: { select: { user_name: true } } },
          take: 1,
        },
      },
    }),
  ]);

  const totalUnitsCount = allUnits.length;
  const occupiedUnitsCount = allUnits.filter((u) => u.status === "Occupied").length;
  const vacantUnitsCount = allUnits.filter((u) => u.status === "Vacant").length;
  const maintenanceUnitsCount = allUnits.filter((u) => u.status === "Maintenance" || u.status === "Reserved").length;
  const occupancyRate = totalUnitsCount > 0 ? Math.round((occupiedUnitsCount / totalUnitsCount) * 100) : 0;

  // -------------------------------------------------------------
  // 2. FINANCIAL & BILLING DATA
  // -------------------------------------------------------------
  const invoiceWhere: any = {
    ...leasePropertyWhere,
  };
  if (startDate) {
    invoiceWhere.invoice_date = { gte: startDate };
  }

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { user_name: true, user_email: true, phone_number: true } },
        },
      },
      details: {
        include: { charge: true },
      },
      transactions: true,
    },
    orderBy: { invoice_date: "asc" },
  });

  let totalInvoicedAmount = 0;
  let totalCollectedAmount = 0;
  let totalOverdueAmount = 0;

  const chargeBreakdownMap: Record<string, number> = {};
  const monthlyFinancialMap: Record<string, { month: string; invoiced: number; collected: number }> = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Aging buckets
  let agingCurrent = 0; // 0-30d overdue
  let aging30 = 0;      // 31-60d
  let aging60 = 0;      // 61-90d
  let aging90Plus = 0;  // 90d+

  const defaultersMap: Record<string, {
    unitNumber: string;
    propertyName: string;
    tenantName: string;
    overdueAmount: number;
    unpaidInvoicesCount: number;
    maxDaysOverdue: number;
  }> = {};

  for (const inv of invoices) {
    const invTotal = Number(inv.total_amount) || 0;
    totalInvoicedAmount += invTotal;

    const paidTx = inv.transactions.filter((t) => t.transaction_status === "Success" || t.transaction_status === "Completed");
    const paidSum = paidTx.reduce((sum, tx) => sum + (Number(tx.transaction_amount) || 0), 0);

    // If status is Paid or transactions exist
    const isPaid = inv.status === "Paid" || paidSum >= invTotal;
    const invCollected = isPaid ? invTotal : paidSum;
    totalCollectedAmount += invCollected;

    const invOutstanding = Math.max(0, invTotal - invCollected);
    const dueDate = new Date(inv.due_date);
    const isOverdue = inv.status === "Overdue" || (!isPaid && dueDate < today);

    if (isOverdue && invOutstanding > 0) {
      totalOverdueAmount += invOutstanding;

      const diffDays = Math.max(1, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      if (diffDays <= 30) agingCurrent += invOutstanding;
      else if (diffDays <= 60) aging30 += invOutstanding;
      else if (diffDays <= 90) aging60 += invOutstanding;
      else aging90Plus += invOutstanding;

      // Defaulter grouping
      const unitKey = inv.lease?.unit?.unit_id || inv.lease_id;
      if (!defaultersMap[unitKey]) {
        defaultersMap[unitKey] = {
          unitNumber: inv.lease?.unit?.unit_number || "N/A",
          propertyName: inv.lease?.unit?.property?.property_name || "Testing Condominium",
          tenantName: inv.lease?.tenant?.user_name || "Resident",
          overdueAmount: 0,
          unpaidInvoicesCount: 0,
          maxDaysOverdue: 0,
        };
      }
      defaultersMap[unitKey].overdueAmount += invOutstanding;
      defaultersMap[unitKey].unpaidInvoicesCount += 1;
      defaultersMap[unitKey].maxDaysOverdue = Math.max(defaultersMap[unitKey].maxDaysOverdue, diffDays);
    }

    // Monthly chart bucket
    const d = new Date(inv.invoice_date);
    const monthKey = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    if (!monthlyFinancialMap[monthKey]) {
      monthlyFinancialMap[monthKey] = { month: monthKey, invoiced: 0, collected: 0 };
    }
    monthlyFinancialMap[monthKey].invoiced += invTotal;
    monthlyFinancialMap[monthKey].collected += invCollected;

    // Charge details breakdown
    for (const det of inv.details) {
      const chargeType = det.charge?.charge_type || det.charge?.charge_name || "General Maintenance";
      const detPrice = Number(det.total_price) || 0;
      chargeBreakdownMap[chargeType] = (chargeBreakdownMap[chargeType] || 0) + detPrice;
    }
  }

  const collectionRate = totalInvoicedAmount > 0
    ? Math.round((totalCollectedAmount / totalInvoicedAmount) * 100)
    : 0;

  const financialTrend = Object.values(monthlyFinancialMap);
  const chargeTypeDistribution = Object.entries(chargeBreakdownMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  const topDefaulters = Object.values(defaultersMap)
    .sort((a, b) => b.overdueAmount - a.overdueAmount)
    .slice(0, 10);

  // -------------------------------------------------------------
  // 3. MAINTENANCE & HELPDESK DATA
  // -------------------------------------------------------------
  const ticketWhere: any = {
    ...ticketPropertyWhere,
  };
  if (startDate) {
    ticketWhere.created_at = { gte: startDate };
  }

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { user_name: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const totalTickets = tickets.length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed");
  const inProgressTickets = tickets.filter((t) => t.status === "In Progress" || t.status === "Pending Parts" || t.status === "KIV");
  const openTickets = tickets.filter((t) => t.status === "Open");

  // Mean Time To Resolve (MTTR in hours)
  let totalResolutionHours = 0;
  let resolvedWithDatesCount = 0;

  for (const t of resolvedTickets) {
    if (t.resolved_at) {
      const hours = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      if (hours >= 0) {
        totalResolutionHours += hours;
        resolvedWithDatesCount++;
      }
    }
  }

  const avgResolutionHours = resolvedWithDatesCount > 0
    ? Math.round(totalResolutionHours / resolvedWithDatesCount)
    : 24;

  const resolutionRate = totalTickets > 0
    ? Math.round((resolvedTickets.length / totalTickets) * 100)
    : 100;

  // Category Breakdown
  const categoryCountMap: Record<string, { total: number; resolved: number }> = {};
  const priorityCountMap: Record<string, number> = { Urgent: 0, High: 0, Normal: 0, Low: 0 };

  for (const t of tickets) {
    const catName = t.ticket_category || "General";
    if (!categoryCountMap[catName]) {
      categoryCountMap[catName] = { total: 0, resolved: 0 };
    }
    categoryCountMap[catName].total++;
    if (t.status === "Resolved" || t.status === "Closed") {
      categoryCountMap[catName].resolved++;
    }

    let priority = t.priority || "Normal";
    if (priority === "Medium") priority = "Normal";
    if (priorityCountMap[priority] !== undefined) {
      priorityCountMap[priority]++;
    } else {
      priorityCountMap["Normal"] = (priorityCountMap["Normal"] || 0) + 1;
    }
  }

  const categoryBreakdown = Object.entries(categoryCountMap).map(([name, stats]) => ({
    name,
    total: stats.total,
    resolved: stats.resolved,
  })).sort((a, b) => b.total - a.total);

  const priorityBreakdown = Object.entries(priorityCountMap).map(([name, value]) => ({
    name,
    value,
  }));

  const unresolvedUrgentTickets = tickets
    .filter((t) => (t.priority === "Urgent" || t.priority === "High") && t.status !== "Resolved" && t.status !== "Closed")
    .slice(0, 5);

  // -------------------------------------------------------------
  // 4. FACILITIES & BOOKINGS DATA
  // -------------------------------------------------------------
  const bookingWhere: any = {
    ...bookingPropertyWhere,
  };
  if (startDate) {
    bookingWhere.booking_date = { gte: startDate };
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      facility: { include: { property: true } },
      lease: {
        include: {
          unit: true,
          tenant: { select: { user_name: true } },
        },
      },
    },
    orderBy: { booking_date: "desc" },
  });

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.booking_status === "Confirmed" || b.booking_status === "Approved");

  let totalBookingHours = 0;
  const facilityUsageMap: Record<string, { count: number; hours: number }> = {};
  const timeSlotMap: Record<string, number> = {
    "Morning (08:00 - 12:00)": 0,
    "Afternoon (12:00 - 17:00)": 0,
    "Evening (17:00 - 22:00)": 0,
  };

  for (const b of bookings) {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    const durationHours = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    totalBookingHours += durationHours;

    const facName = b.facility?.facility_name || "Facility";
    if (!facilityUsageMap[facName]) {
      facilityUsageMap[facName] = { count: 0, hours: 0 };
    }
    facilityUsageMap[facName].count++;
    facilityUsageMap[facName].hours += durationHours;

    const startHour = start.getHours();
    if (startHour < 12) timeSlotMap["Morning (08:00 - 12:00)"]++;
    else if (startHour < 17) timeSlotMap["Afternoon (12:00 - 17:00)"]++;
    else timeSlotMap["Evening (17:00 - 22:00)"]++;
  }

  const amenityUsage = Object.entries(facilityUsageMap).map(([name, data]) => ({
    name,
    count: data.count,
    hours: Math.round(data.hours),
  })).sort((a, b) => b.hours - a.hours);

  const timeSlotDistribution = Object.entries(timeSlotMap).map(([slot, count]) => ({
    slot,
    count,
  }));

  // -------------------------------------------------------------
  // 5. VISITORS & GUARDHOUSE SECURITY DATA
  // -------------------------------------------------------------
  const visitorWhere: any = {
    ...visitorPropertyWhere,
  };
  if (startDate) {
    visitorWhere.created_at = { gte: startDate };
  }

  const visitors = await prisma.visitor.findMany({
    where: visitorWhere,
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { user_name: true } },
        },
      },
      property: true,
    },
    orderBy: { created_at: "desc" },
  });

  const totalVisitors = visitors.length;
  const activeInside = visitors.filter((v) => v.check_in_time && !v.check_out_time).length;
  const checkedOutCount = visitors.filter((v) => v.check_out_time).length;

  const visitorTypeMap: Record<string, number> = {};
  const dailyVisitorTrafficMap: Record<string, number> = {};

  for (const v of visitors) {
    const vType = v.visitor_type || "Guest";
    visitorTypeMap[vType] = (visitorTypeMap[vType] || 0) + 1;

    const dateKey = new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyVisitorTrafficMap[dateKey] = (dailyVisitorTrafficMap[dateKey] || 0) + 1;
  }

  const visitorTypeDistribution = Object.entries(visitorTypeMap).map(([type, count]) => ({
    type,
    count,
  }));

  const visitorTrafficTrend = Object.entries(dailyVisitorTrafficMap).map(([date, count]) => ({
    date,
    count,
  }));

  const activeVisitorsList = visitors
    .filter((v) => v.check_in_time && !v.check_out_time)
    .slice(0, 10);

  return {
    dateRange,
    propertyId,
    properties,
    overview: {
      totalUnitsCount,
      occupiedUnitsCount,
      vacantUnitsCount,
      maintenanceUnitsCount,
      occupancyRate,
      collectionRate,
      totalInvoicedAmount,
      totalCollectedAmount,
      totalOverdueAmount,
      resolutionRate,
      avgResolutionHours,
      totalTickets,
      resolvedTicketsCount: resolvedTickets.length,
      activeCheckedInCount: activeInside,
      totalVisitorsCount: totalVisitors,
      checkedOutCount,
      unresolvedUrgentTickets,
      topDefaulters,
    },
    financial: {
      totalInvoiced: totalInvoicedAmount,
      totalCollected: totalCollectedAmount,
      totalOverdue: totalOverdueAmount,
      collectionRate,
      agingReceivables: {
        current: agingCurrent,
        days30: aging30,
        days60: aging60,
        days90Plus: aging90Plus,
      },
      trend: financialTrend,
      chargeDistribution: chargeTypeDistribution,
      topDefaulters,
    },
    maintenance: {
      totalTickets,
      resolvedCount: resolvedTickets.length,
      inProgressCount: inProgressTickets.length,
      openCount: openTickets.length,
      resolutionRate,
      avgResolutionHours,
      categoryBreakdown,
      priorityBreakdown,
      unresolvedUrgentTickets,
    },
    facilities: {
      totalBookings,
      confirmedCount: confirmedBookings.length,
      totalHours: Math.round(totalBookingHours),
      amenityUsage,
      timeSlotDistribution,
      bookingsList: bookings.slice(0, 10),
    },
    visitors: {
      totalVisitors,
      activeInside,
      checkedOutCount,
      typeDistribution: visitorTypeDistribution,
      trafficTrend: visitorTrafficTrend,
      activeVisitorsList,
    },
  };
}
