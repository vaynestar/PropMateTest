import "server-only";
import prisma from "@/lib/prisma";
import { getDateRangeBoundary, type DateRangeKey } from "@/lib/reports";
import { getInvoiceDocSettings, docDate, docMoney } from "@/lib/invoice-document";
import { todayDateMY } from "@/lib/short-date";
import { findReport, type LoadedReport, type ReportBlock } from "./catalog";

/**
 * One loader per report (DEV-249).
 *
 * Each queries only what its own page prints. The combined report of DEV-248
 * ran every query in the system to render a page that showed a tenth of it;
 * the arrears list does not need the visitor table, and now it does not fetch
 * it.
 */

/** Confirmed money. `Completed` is the gateway's word, `Success` the office's. */
const PAID_TX = ["Success", "Completed"];
/** An invoice that is no longer chasing money. */
const SETTLED_INVOICE = ["Paid", "Inactive", "Voided"];

/** A report is a report, not a database dump - past this it is a printing bill. */
const ROW_CAP = 250;

const DAY = 86_400_000;
/** Whole days between two @db.Date values (both UTC midnight, so this is exact). */
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY);

type Ctx = {
  propertyId: string;
  dateRange: DateRangeKey;
  start: Date | null;
  today: Date;
  money: (n: number) => string;
  pct: (n: number) => string;
  /** Appends a "showing the first N" note when a list was cut. */
  capped: <T>(rows: T[]) => { rows: T[]; note?: ReportBlock };
};

const share = (part: number, whole: number, pct: Ctx["pct"]) => (whole > 0 ? pct((part / whole) * 100) : "—");

const time = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(d));

export async function loadReport(
  slug: string,
  propertyId: string,
  dateRange: DateRangeKey
): Promise<LoadedReport | null> {
  const def = findReport(slug);
  if (!def) return null;

  const settings = await getInvoiceDocSettings();
  const ctx: Ctx = {
    propertyId,
    dateRange,
    start: def.basis === "period" ? getDateRangeBoundary(dateRange) : null,
    today: todayDateMY(),
    money: (n) => docMoney(n, settings.currency),
    pct: (n) => `${Math.round(n)}%`,
    capped: (rows) =>
      rows.length > ROW_CAP
        ? {
            rows: rows.slice(0, ROW_CAP),
            note: {
              kind: "note",
              text: `${rows.length} records matched. The first ${ROW_CAP} are listed; use Export CSV on the Reports screen for the full set.`,
            } as ReportBlock,
          }
        : { rows },
  };

  const loader = LOADERS[slug];
  const { summary, blocks } = await loader(ctx);
  return { def, summary, blocks };
}

type Loaded = { summary: string; blocks: ReportBlock[] };

/* ------------------------------------------------------------------ */
/* Property scoping. Each model reaches a property by a different path. */
/* ------------------------------------------------------------------ */

const byUnit = (p: string) => (p === "ALL" ? {} : { property_id: p });
const byLease = (p: string) => (p === "ALL" ? {} : { lease: { unit: { property_id: p } } });
const byFacility = (p: string) => (p === "ALL" ? {} : { facility: { property_id: p } });
const byTicket = (p: string) =>
  p === "ALL"
    ? {}
    : {
        OR: [
          { property_id: p },
          { unit: { property_id: p } },
          { lease: { unit: { property_id: p } } },
        ],
      };
const byVisitor = (p: string) =>
  p === "ALL" ? {} : { OR: [{ property_id: p }, { lease: { unit: { property_id: p } } }] };

/* ================================================================== */
/* 1. Billing and Collection Analysis                                 */
/* ================================================================== */

async function collectionSummary(c: Ctx): Promise<Loaded> {
  const invoices = await prisma.invoice.findMany({
    where: {
      ...byLease(c.propertyId),
      ...(c.start ? { invoice_date: { gte: c.start } } : {}),
    },
    select: {
      invoice_date: true,
      total_amount: true,
      status: true,
      details: { select: { total_price: true, charge: { select: { charge_type: true, charge_name: true } } } },
      transactions: { select: { transaction_amount: true, transaction_status: true } },
      lease: { select: { unit: { select: { unit_id: true, property: { select: { property_name: true } } } } } },
    },
    orderBy: { invoice_date: "asc" },
  });

  let billed = 0;
  let collected = 0;
  const months = new Map<string, { label: string; count: number; billed: number; collected: number }>();
  const charges = new Map<string, number>();
  const properties = new Map<string, { billed: number; collected: number }>();
  const units = new Set<string>();

  for (const inv of invoices) {
    const total = Number(inv.total_amount) || 0;
    const paid = inv.transactions
      .filter((t) => PAID_TX.includes(t.transaction_status))
      .reduce((s, t) => s + (Number(t.transaction_amount) || 0), 0);
    billed += total;
    collected += paid;
    if (inv.lease?.unit?.unit_id) units.add(inv.lease.unit.unit_id);

    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
      .format(inv.invoice_date)
      .slice(0, 7);
    const label = docDate(inv.invoice_date).slice(3); // "Nov 2026"
    const m = months.get(key) ?? { label, count: 0, billed: 0, collected: 0 };
    m.count += 1;
    m.billed += total;
    m.collected += paid;
    months.set(key, m);

    for (const d of inv.details) {
      const type = d.charge?.charge_type || d.charge?.charge_name || "Other";
      charges.set(type, (charges.get(type) || 0) + (Number(d.total_price) || 0));
    }

    const pname = inv.lease?.unit?.property?.property_name ?? "Unassigned";
    const p = properties.get(pname) ?? { billed: 0, collected: 0 };
    p.billed += total;
    p.collected += paid;
    properties.set(pname, p);
  }

  const outstanding = billed - collected;
  const blocks: ReportBlock[] = [
    {
      kind: "kpi",
      items: [
        { label: "Invoices issued", value: String(invoices.length) },
        { label: "Units billed", value: String(units.size) },
        { label: "Gross billed", value: c.money(billed) },
        { label: "Collected", value: c.money(collected) },
        { label: "Not yet collected", value: c.money(outstanding) },
        { label: "Collection rate", value: share(collected, billed, c.pct) },
      ],
    },
    {
      kind: "table",
      caption: "Month by month",
      head: ["Month", "Invoices", "Billed", "Collected", "Collection rate"],
      rows: [...months.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, m]) => [m.label, String(m.count), c.money(m.billed), c.money(m.collected), share(m.collected, m.billed, c.pct)]),
      total: ["Total", String(invoices.length), c.money(billed), c.money(collected), share(collected, billed, c.pct)],
      empty: "Nothing was billed in this period.",
    },
    {
      kind: "table",
      caption: "Revenue by charge type",
      head: ["Charge type", "Amount", "Share of billed"],
      rows: [...charges.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => [name, c.money(amount), share(amount, billed, c.pct)]),
      empty: "No charge lines in this period.",
    },
  ];

  if (c.propertyId === "ALL" && properties.size > 1) {
    blocks.push({
      kind: "table",
      caption: "By property",
      head: ["Property", "Billed", "Collected", "Collection rate"],
      align: "lrrr",
      rows: [...properties.entries()]
        .sort((a, b) => b[1].billed - a[1].billed)
        .map(([name, p]) => [name, c.money(p.billed), c.money(p.collected), share(p.collected, p.billed, c.pct)]),
    });
  }

  return {
    summary: `${invoices.length} invoices totalling ${c.money(billed)} across ${units.size} units. ${c.money(
      collected
    )} collected, a rate of ${share(collected, billed, c.pct)}.`,
    blocks,
  };
}

/* ================================================================== */
/* 2. Aged Receivables                                                */
/* ================================================================== */

async function agedReceivables(c: Ctx): Promise<Loaded> {
  const invoices = await prisma.invoice.findMany({
    where: {
      ...byLease(c.propertyId),
      status: { notIn: SETTLED_INVOICE },
      issued_at: { not: null },
    },
    select: {
      invoice_no: true,
      due_date: true,
      total_amount: true,
      transactions: { select: { transaction_amount: true, transaction_status: true } },
      lease: {
        select: {
          tenant: { select: { user_name: true } },
          unit: { select: { unit_number: true, property: { select: { property_name: true } } } },
        },
      },
    },
  });

  type Bucket = "current" | "d30" | "d60" | "d90";
  const bucketOf = (days: number): Bucket => (days <= 30 ? "current" : days <= 60 ? "d30" : days <= 90 ? "d60" : "d90");
  const buckets: Record<Bucket, number> = { current: 0, d30: 0, d60: 0, d90: 0 };

  const perUnit = new Map<
    string,
    { unit: string; resident: string; property: string; bills: number; oldest: number; amount: number }
  >();
  let total = 0;

  for (const inv of invoices) {
    const paid = inv.transactions
      .filter((t) => PAID_TX.includes(t.transaction_status))
      .reduce((s, t) => s + (Number(t.transaction_amount) || 0), 0);
    const owed = (Number(inv.total_amount) || 0) - paid;
    if (owed <= 0) continue;

    const days = Math.max(0, daysBetween(inv.due_date, c.today));
    buckets[bucketOf(days)] += owed;
    total += owed;

    const unit = inv.lease?.unit?.unit_number ?? "—";
    const property = inv.lease?.unit?.property?.property_name ?? "—";
    const key = `${property}|${unit}`;
    const row = perUnit.get(key) ?? {
      unit,
      resident: inv.lease?.tenant?.user_name ?? "—",
      property,
      bills: 0,
      oldest: 0,
      amount: 0,
    };
    row.bills += 1;
    row.oldest = Math.max(row.oldest, days);
    row.amount += owed;
    perUnit.set(key, row);
  }

  const list = [...perUnit.values()].sort((a, b) => b.amount - a.amount);
  const { rows: shown, note } = c.capped(list);

  const blocks: ReportBlock[] = [
    {
      kind: "kpi",
      items: [
        { label: "Total arrears", value: c.money(total) },
        { label: "Units in arrears", value: String(list.length) },
        { label: "Unpaid bills", value: String(list.reduce((s, r) => s + r.bills, 0)) },
        { label: "Oldest debt", value: list.length ? `${Math.max(...list.map((r) => r.oldest))} days` : "—" },
      ],
    },
    {
      kind: "table",
      caption: "By age",
      head: ["Age bracket", "Amount", "Share of arrears"],
      rows: [
        ["Current (0–30 days)", c.money(buckets.current), share(buckets.current, total, c.pct)],
        ["31–60 days", c.money(buckets.d30), share(buckets.d30, total, c.pct)],
        ["61–90 days", c.money(buckets.d60), share(buckets.d60, total, c.pct)],
        ["Over 90 days", c.money(buckets.d90), share(buckets.d90, total, c.pct)],
      ],
      total: ["Total", c.money(total), "100%"],
    },
    {
      kind: "table",
      caption: "By unit, largest first",
      head: ["Unit", "Resident", "Property", "Bills", "Oldest (days)", "Amount owed"],
      align: "lllrrr",
      rows: shown.map((r) => [r.unit, r.resident, r.property, String(r.bills), String(r.oldest), c.money(r.amount)]),
      total: ["Total", "", "", String(list.reduce((s, r) => s + r.bills, 0)), "", c.money(total)],
      empty: "No unit is in arrears. Nothing to chase.",
    },
  ];
  if (note) blocks.push(note);

  return {
    summary: total
      ? `${c.money(total)} owed across ${list.length} units. ${share(buckets.d90, total, c.pct)} of it is more than 90 days old.`
      : "No outstanding balances. Every issued invoice is settled.",
    blocks,
  };
}

/* ================================================================== */
/* 3. Payments Received                                               */
/* ================================================================== */

async function paymentsReceived(c: Ctx): Promise<Loaded> {
  const tx = await prisma.paymentTransaction.findMany({
    where: {
      transaction_status: { in: PAID_TX },
      ...(c.start ? { payment_date: { gte: c.start } } : {}),
      invoice: byLease(c.propertyId),
    },
    select: {
      payment_date: true,
      transaction_amount: true,
      payment_method: true,
      reference_number: true,
      invoice: {
        select: {
          invoice_no: true,
          lease: {
            select: {
              tenant: { select: { user_name: true } },
              unit: { select: { unit_number: true } },
            },
          },
        },
      },
    },
    orderBy: { payment_date: "desc" },
  });

  const total = tx.reduce((s, t) => s + (Number(t.transaction_amount) || 0), 0);
  const methods = new Map<string, { count: number; amount: number }>();
  for (const t of tx) {
    const key = t.payment_method || "Unspecified";
    const m = methods.get(key) ?? { count: 0, amount: 0 };
    m.count += 1;
    m.amount += Number(t.transaction_amount) || 0;
    methods.set(key, m);
  }

  const { rows: shown, note } = c.capped(tx);
  const blocks: ReportBlock[] = [
    {
      kind: "kpi",
      items: [
        { label: "Payments received", value: String(tx.length) },
        { label: "Total received", value: c.money(total) },
        { label: "Average payment", value: tx.length ? c.money(total / tx.length) : "—" },
        { label: "Methods used", value: String(methods.size) },
      ],
    },
    {
      kind: "table",
      caption: "By payment method",
      head: ["Method", "Payments", "Amount", "Share"],
      rows: [...methods.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([name, m]) => [name, String(m.count), c.money(m.amount), share(m.amount, total, c.pct)]),
      total: ["Total", String(tx.length), c.money(total), "100%"],
      empty: "No payment was confirmed in this period.",
    },
    {
      kind: "table",
      caption: "Every payment, newest first",
      head: ["Date", "Invoice", "Unit", "Resident", "Method", "Reference", "Amount"],
      align: "llllllr",
      rows: shown.map((t) => [
        docDate(t.payment_date),
        t.invoice?.invoice_no ?? "—",
        t.invoice?.lease?.unit?.unit_number ?? "—",
        t.invoice?.lease?.tenant?.user_name ?? "—",
        t.payment_method || "—",
        t.reference_number || "—",
        c.money(Number(t.transaction_amount) || 0),
      ]),
      empty: "No payment was confirmed in this period.",
    },
  ];
  if (note) blocks.push(note);

  return {
    summary: `${tx.length} confirmed payments totalling ${c.money(total)}.`,
    blocks,
  };
}

/* ================================================================== */
/* 4. Occupancy and Tenancy                                           */
/* ================================================================== */

async function occupancyTenancy(c: Ctx): Promise<Loaded> {
  const units = await prisma.unit.findMany({
    where: byUnit(c.propertyId),
    select: {
      unit_number: true,
      unit_type: true,
      floor_number: true,
      area_sqft: true,
      status: true,
      property: { select: { property_name: true } },
      leases: {
        where: { status: "Active" },
        select: { move_in_date: true, tenant: { select: { user_name: true, user_email: true } } },
        orderBy: { move_in_date: "desc" },
        take: 1,
      },
    },
    orderBy: [{ property: { property_name: "asc" } }, { unit_number: "asc" }],
  });

  const statuses = new Map<string, number>();
  for (const u of units) statuses.set(u.status, (statuses.get(u.status) || 0) + 1);
  const occupied = statuses.get("Occupied") || 0;

  const { rows: shown, note } = c.capped(units);
  const blocks: ReportBlock[] = [
    {
      kind: "kpi",
      items: [
        { label: "Total units", value: String(units.length) },
        { label: "Occupied", value: String(occupied) },
        { label: "Vacant", value: String(statuses.get("Vacant") || 0) },
        { label: "Occupancy rate", value: share(occupied, units.length, c.pct) },
      ],
    },
    {
      kind: "table",
      caption: "By status",
      head: ["Status", "Units", "Share"],
      rows: [...statuses.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => [s, String(n), share(n, units.length, c.pct)]),
      total: ["Total", String(units.length), "100%"],
    },
    {
      kind: "table",
      caption: "Unit register",
      head: ["Unit", "Property", "Type", "Floor", "Area (sq ft)", "Status", "Resident", "Resident since"],
      align: "lllrrlll",
      rows: shown.map((u) => [
        u.unit_number,
        u.property?.property_name ?? "—",
        u.unit_type,
        String(u.floor_number),
        Number(u.area_sqft).toLocaleString("en-MY"),
        u.status,
        u.leases[0]?.tenant?.user_name ?? "—",
        u.leases[0]?.move_in_date ? docDate(u.leases[0].move_in_date) : "—",
      ]),
      empty: "No units are registered for this property.",
    },
  ];
  if (note) blocks.push(note);

  return {
    summary: `${units.length} units, ${occupied} occupied (${share(occupied, units.length, c.pct)}).`,
    blocks,
  };
}

/* ================================================================== */
/* 5. Helpdesk Performance                                            */
/* ================================================================== */

async function helpdeskSummary(c: Ctx): Promise<Loaded> {
  const tickets = await prisma.ticket.findMany({
    where: {
      ...byTicket(c.propertyId),
      ...(c.start ? { created_at: { gte: c.start } } : {}),
    },
    select: {
      ticket_category: true,
      priority: true,
      status: true,
      cost: true,
      created_at: true,
      resolved_at: true,
    },
  });

  const closed = tickets.filter((t) => t.resolved_at);
  const avgHours = closed.length
    ? Math.round(
        closed.reduce((s, t) => s + (t.resolved_at!.getTime() - t.created_at.getTime()) / 3_600_000, 0) / closed.length
      )
    : 0;
  const cost = tickets.reduce((s, t) => s + (Number(t.cost) || 0), 0);

  const cat = new Map<string, { total: number; done: number; hours: number; closed: number }>();
  const pri = new Map<string, { total: number; done: number }>();
  const sta = new Map<string, number>();
  for (const t of tickets) {
    const ck = t.ticket_category || "Uncategorised";
    const cv = cat.get(ck) ?? { total: 0, done: 0, hours: 0, closed: 0 };
    cv.total += 1;
    if (t.resolved_at) {
      cv.done += 1;
      cv.closed += 1;
      cv.hours += (t.resolved_at.getTime() - t.created_at.getTime()) / 3_600_000;
    }
    cat.set(ck, cv);

    const pk = t.priority || "Normal";
    const pv = pri.get(pk) ?? { total: 0, done: 0 };
    pv.total += 1;
    if (t.resolved_at) pv.done += 1;
    pri.set(pk, pv);

    sta.set(t.status, (sta.get(t.status) || 0) + 1);
  }

  return {
    summary: `${tickets.length} tickets logged, ${closed.length} closed (${share(
      closed.length,
      tickets.length,
      c.pct
    )}), averaging ${avgHours} hours to resolve.`,
    blocks: [
      {
        kind: "kpi",
        items: [
          { label: "Tickets logged", value: String(tickets.length) },
          { label: "Closed", value: String(closed.length) },
          { label: "Still open", value: String(tickets.length - closed.length) },
          { label: "Resolution rate", value: share(closed.length, tickets.length, c.pct) },
          { label: "Average time to resolve", value: `${avgHours} hours` },
          { label: "Recorded cost", value: c.money(cost) },
        ],
      },
      {
        kind: "table",
        caption: "By category",
        head: ["Category", "Logged", "Closed", "Outstanding", "Avg hours to close"],
        rows: [...cat.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([name, v]) => [
            name,
            String(v.total),
            String(v.done),
            String(v.total - v.done),
            v.closed ? String(Math.round(v.hours / v.closed)) : "—",
          ]),
        total: ["Total", String(tickets.length), String(closed.length), String(tickets.length - closed.length), String(avgHours)],
        empty: "No tickets were logged in this period.",
      },
      {
        kind: "table",
        caption: "By priority",
        head: ["Priority", "Logged", "Closed", "Outstanding"],
        rows: [...pri.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([name, v]) => [name, String(v.total), String(v.done), String(v.total - v.done)]),
        empty: "No tickets were logged in this period.",
      },
      {
        kind: "table",
        caption: "By current status",
        head: ["Status", "Tickets", "Share"],
        rows: [...sta.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, n]) => [name, String(n), share(n, tickets.length, c.pct)]),
        empty: "No tickets were logged in this period.",
      },
    ],
  };
}

/* ================================================================== */
/* 6. Open Work Orders                                                */
/* ================================================================== */

async function openWorkOrders(c: Ctx): Promise<Loaded> {
  const tickets = await prisma.ticket.findMany({
    where: {
      ...byTicket(c.propertyId),
      status: { notIn: ["Resolved", "Closed"] },
    },
    select: {
      title: true,
      ticket_category: true,
      priority: true,
      status: true,
      location_type: true,
      location_detail: true,
      created_at: true,
      unit: { select: { unit_number: true } },
      lease: { select: { unit: { select: { unit_number: true } } } },
      assignee: { select: { user_name: true } },
      reporter: { select: { user_name: true } },
    },
    orderBy: { created_at: "asc" },
  });

  const now = Date.now();
  const age = (d: Date) => Math.max(0, Math.floor((now - d.getTime()) / DAY));
  const urgent = tickets.filter((t) => t.priority === "Urgent" || t.priority === "High").length;
  const unassigned = tickets.filter((t) => !t.assignee).length;
  const overAWeek = tickets.filter((t) => age(t.created_at) > 7).length;

  const { rows: shown, note } = c.capped(tickets);
  const blocks: ReportBlock[] = [
    {
      kind: "kpi",
      items: [
        { label: "Open work orders", value: String(tickets.length) },
        { label: "Urgent or high", value: String(urgent) },
        { label: "Open over 7 days", value: String(overAWeek) },
        { label: "Not yet assigned", value: String(unassigned) },
        { label: "Oldest", value: tickets.length ? `${age(tickets[0].created_at)} days` : "—" },
      ],
    },
    {
      kind: "table",
      caption: "Oldest first",
      head: ["Raised", "Days", "Title", "Category", "Priority", "Location", "Status", "Assigned to"],
      align: "lrllllll",
      rows: shown.map((t) => [
        docDate(t.created_at),
        String(age(t.created_at)),
        t.title,
        t.ticket_category || "—",
        t.priority || "—",
        t.unit?.unit_number ?? t.lease?.unit?.unit_number ?? t.location_detail ?? t.location_type ?? "—",
        t.status,
        t.assignee?.user_name ?? "Unassigned",
      ]),
      empty: "Nothing is outstanding. Every ticket is resolved or closed.",
    },
  ];
  if (note) blocks.push(note);

  return {
    summary: tickets.length
      ? `${tickets.length} work orders open, ${urgent} of them urgent or high priority, ${overAWeek} waiting more than a week.`
      : "No open work orders.",
    blocks,
  };
}

/* ================================================================== */
/* 7. Facilities Maintenance Schedule                                 */
/* ================================================================== */

async function facilityMaintenanceSchedule(c: Ctx): Promise<Loaded> {
  const facilities = await prisma.facility.findMany({
    where: byUnit(c.propertyId),
    select: {
      facility_name: true,
      facility_type: true,
      facility_status: true,
      next_maintenance_date: true,
      property: { select: { property_name: true } },
      maintenance: {
        select: { performed_on: true, description: true, performed_by: true },
        orderBy: { performed_on: "desc" },
        take: 1,
      },
    },
    orderBy: [{ next_maintenance_date: "asc" }, { facility_name: "asc" }],
  });

  let overdue = 0;
  let soon = 0;
  let unscheduled = 0;
  let neverServiced = 0;

  const rows = facilities.map((f) => {
    const last = f.maintenance[0];
    if (!last) neverServiced += 1;

    let due = "Not scheduled";
    let inDays = "—";
    if (f.next_maintenance_date) {
      const d = daysBetween(c.today, f.next_maintenance_date);
      due = docDate(f.next_maintenance_date);
      if (d < 0) {
        overdue += 1;
        inDays = `${-d} overdue`;
      } else {
        if (d <= 30) soon += 1;
        inDays = d === 0 ? "Today" : `in ${d}`;
      }
    } else {
      unscheduled += 1;
    }

    return [
      f.facility_name,
      f.property?.property_name ?? "—",
      f.facility_type,
      f.facility_status || "—",
      last ? docDate(last.performed_on) : "Never",
      last?.performed_by || "—",
      due,
      inDays,
    ];
  });

  const history = await prisma.facilityMaintenance.findMany({
    where: c.propertyId === "ALL" ? {} : { facility: { property_id: c.propertyId } },
    select: {
      performed_on: true,
      description: true,
      performed_by: true,
      next_due: true,
      facility: { select: { facility_name: true } },
    },
    orderBy: { performed_on: "desc" },
    take: 20,
  });

  return {
    summary: overdue
      ? `${facilities.length} facilities. ${overdue} overdue for service, ${soon} due within 30 days.`
      : `${facilities.length} facilities, none overdue. ${soon} due within 30 days.`,
    blocks: [
      {
        kind: "kpi",
        items: [
          { label: "Facilities", value: String(facilities.length) },
          { label: "Overdue", value: String(overdue) },
          { label: "Due within 30 days", value: String(soon) },
          { label: "No date set", value: String(unscheduled) },
          { label: "Never serviced", value: String(neverServiced) },
        ],
      },
      {
        kind: "table",
        caption: "Service schedule, soonest first",
        head: ["Facility", "Property", "Type", "Status", "Last serviced", "By", "Next due", "Days"],
        align: "llllllll",
        rows,
        empty: "No facilities are registered for this property.",
      },
      {
        kind: "table",
        caption: "Recent service history",
        head: ["Date", "Facility", "Work carried out", "By", "Next due set"],
        align: "lllll",
        rows: history.map((h) => [
          docDate(h.performed_on),
          h.facility?.facility_name ?? "—",
          h.description,
          h.performed_by || "—",
          h.next_due ? docDate(h.next_due) : "—",
        ]),
        empty: "No maintenance visit has been logged yet.",
      },
    ],
  };
}

/* ================================================================== */
/* 8. Facility Utilisation                                            */
/* ================================================================== */

async function facilityUtilisation(c: Ctx): Promise<Loaded> {
  const bookings = await prisma.booking.findMany({
    where: {
      ...byFacility(c.propertyId),
      ...(c.start ? { booking_date: { gte: c.start } } : {}),
    },
    select: {
      booking_date: true,
      booking_status: true,
      start_time: true,
      end_time: true,
      pax_count: true,
      facility: { select: { facility_name: true } },
      lease: { select: { unit: { select: { unit_number: true } }, tenant: { select: { user_name: true } } } },
      user: { select: { user_name: true } },
    },
    orderBy: { booking_date: "desc" },
  });

  const hoursOf = (b: { start_time: Date; end_time: Date }) =>
    Math.max(0, (b.end_time.getTime() - b.start_time.getTime()) / 3_600_000);

  let totalHours = 0;
  const per = new Map<string, { count: number; hours: number; pax: number }>();
  const sta = new Map<string, number>();
  const bands = new Map<string, number>([
    ["Morning (before 12:00)", 0],
    ["Afternoon (12:00–17:00)", 0],
    ["Evening (from 17:00)", 0],
  ]);

  for (const b of bookings) {
    const h = hoursOf(b);
    totalHours += h;
    const key = b.facility?.facility_name ?? "—";
    const v = per.get(key) ?? { count: 0, hours: 0, pax: 0 };
    v.count += 1;
    v.hours += h;
    v.pax += b.pax_count || 0;
    per.set(key, v);

    sta.set(b.booking_status, (sta.get(b.booking_status) || 0) + 1);

    const hour = Number(time(b.start_time).slice(0, 2));
    const band = hour < 12 ? "Morning (before 12:00)" : hour < 17 ? "Afternoon (12:00–17:00)" : "Evening (from 17:00)";
    bands.set(band, (bands.get(band) || 0) + 1);
  }

  const upcoming = bookings
    .filter((b) => b.booking_date.getTime() >= c.today.getTime())
    .sort((a, b) => a.booking_date.getTime() - b.booking_date.getTime())
    .slice(0, 40);

  return {
    summary: `${bookings.length} bookings totalling ${Math.round(totalHours)} hours across ${per.size} amenities.`,
    blocks: [
      {
        kind: "kpi",
        items: [
          { label: "Bookings", value: String(bookings.length) },
          { label: "Hours booked", value: String(Math.round(totalHours)) },
          { label: "Amenities used", value: String(per.size) },
          {
            label: "Average booking",
            value: bookings.length ? `${(totalHours / bookings.length).toFixed(1)} hours` : "—",
          },
        ],
      },
      {
        kind: "table",
        caption: "By amenity",
        head: ["Amenity", "Bookings", "Hours", "Avg group size", "Share of hours"],
        rows: [...per.entries()]
          .sort((a, b) => b[1].hours - a[1].hours)
          .map(([name, v]) => [
            name,
            String(v.count),
            String(Math.round(v.hours)),
            v.count ? (v.pax / v.count).toFixed(1) : "—",
            share(v.hours, totalHours, c.pct),
          ]),
        total: ["Total", String(bookings.length), String(Math.round(totalHours)), "", "100%"],
        empty: "No bookings were made in this period.",
      },
      {
        kind: "table",
        caption: "By status",
        head: ["Status", "Bookings", "Share"],
        rows: [...sta.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, n]) => [name, String(n), share(n, bookings.length, c.pct)]),
        empty: "No bookings were made in this period.",
      },
      {
        kind: "table",
        caption: "By time of day",
        head: ["Time band", "Bookings", "Share"],
        rows: [...bands.entries()].map(([name, n]) => [name, String(n), share(n, bookings.length, c.pct)]),
      },
      {
        kind: "table",
        caption: "Booked ahead, from today",
        head: ["Date", "Amenity", "Time", "Unit", "Resident", "Guests", "Status"],
        align: "lllllrl",
        rows: upcoming.map((b) => [
          docDate(b.booking_date),
          b.facility?.facility_name ?? "—",
          `${time(b.start_time)}–${time(b.end_time)}`,
          b.lease?.unit?.unit_number ?? "—",
          b.lease?.tenant?.user_name ?? b.user?.user_name ?? "—",
          String(b.pax_count ?? "—"),
          b.booking_status,
        ]),
        empty: "Nothing is booked from today onwards.",
      },
    ],
  };
}

/* ================================================================== */
/* 9. Visitor Log                                                     */
/* ================================================================== */

async function visitorLog(c: Ctx): Promise<Loaded> {
  const visitors = await prisma.visitor.findMany({
    where: {
      ...byVisitor(c.propertyId),
      ...(c.start ? { created_at: { gte: c.start } } : {}),
    },
    select: {
      visitor_name: true,
      visitor_type: true,
      visitor_ic_no: true,
      vehicle_plate: true,
      destination: true,
      visit_date: true,
      check_in_time: true,
      check_out_time: true,
      lease: { select: { unit: { select: { unit_number: true } } } },
    },
    orderBy: { created_at: "desc" },
  });

  const inside = visitors.filter((v) => v.check_in_time && !v.check_out_time).length;
  const out = visitors.filter((v) => v.check_out_time).length;
  const neverArrived = visitors.filter((v) => !v.check_in_time).length;

  const types = new Map<string, number>();
  for (const v of visitors) types.set(v.visitor_type || "Guest", (types.get(v.visitor_type || "Guest") || 0) + 1);

  const { rows: shown, note } = c.capped(visitors);
  const blocks: ReportBlock[] = [
    {
      kind: "kpi",
      items: [
        { label: "Passes issued", value: String(visitors.length) },
        { label: "Checked out", value: String(out) },
        { label: "Still inside", value: String(inside) },
        { label: "Never arrived", value: String(neverArrived) },
      ],
    },
    {
      kind: "table",
      caption: "By visitor type",
      head: ["Visitor type", "Passes", "Share"],
      rows: [...types.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => [name, String(n), share(n, visitors.length, c.pct)]),
      total: ["Total", String(visitors.length), "100%"],
      empty: "No passes were issued in this period.",
    },
    {
      kind: "table",
      caption: "Pass log, newest first",
      head: ["Visit date", "Visitor", "Type", "IC / passport", "Vehicle", "Going to", "In", "Out"],
      align: "llllllll",
      rows: shown.map((v) => [
        v.visit_date ? docDate(v.visit_date) : "—",
        v.visitor_name,
        v.visitor_type || "Guest",
        v.visitor_ic_no || "Not recorded",
        v.vehicle_plate || "—",
        v.lease?.unit?.unit_number ?? v.destination ?? "—",
        v.check_in_time ? time(v.check_in_time) : "—",
        v.check_out_time ? time(v.check_out_time) : v.check_in_time ? "Still inside" : "—",
      ]),
      empty: "No passes were issued in this period.",
    },
  ];
  if (note) blocks.push(note);

  return {
    summary: `${visitors.length} passes issued, ${out} completed, ${inside} still on site.`,
    blocks,
  };
}

const LOADERS: Record<string, (c: Ctx) => Promise<Loaded>> = {
  "collection-summary": collectionSummary,
  "aged-receivables": agedReceivables,
  "payments-received": paymentsReceived,
  "occupancy-tenancy": occupancyTenancy,
  "helpdesk-summary": helpdeskSummary,
  "open-work-orders": openWorkOrders,
  "facility-maintenance-schedule": facilityMaintenanceSchedule,
  "facility-utilisation": facilityUtilisation,
  "visitor-log": visitorLog,
};
