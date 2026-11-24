import "server-only";
import prisma from "@/lib/prisma";
import { OPEN_STATUSES, ticketRef } from "@/lib/ticket-states";

/**
 * One search box for the whole property (DEV-277).
 *
 * Finding unit A-12-07 today means Properties, then Units, then a filter,
 * then reading a page of rows — and that is the *easy* one. Finding the
 * invoice behind a phone call means knowing which of eleven screens it
 * lives on first.
 *
 * Three rules this follows:
 *
 * 1. **Scoped to the active property**, like every other figure in the admin
 *    panel. A search that crosses properties would answer a question nobody
 *    asked and leak another building's residents into the results.
 * 2. **A result carries its consequence.** A unit is not just a unit: it is
 *    "owes RM 4,820" or "nobody is in it". That is the difference between a
 *    search box and a directory.
 * 3. **Nothing here acts.** Every row navigates. The artboard offered "send a
 *    reminder" from the palette; there is no mail transport in PropMate, so a
 *    button claiming to send one would be a lie (see Settings → Plumbing).
 */

export type SearchHit = {
  id: string;
  /** Material Symbols glyph. */
  icon: string;
  title: string;
  sub: string;
  href: string;
  /** The consequence, drawn as a chip on the right. */
  tag?: string;
  tone?: "bad" | "warn" | "good";
};

export type SearchSection = { heading: string; hits: SearchHit[] };

const money = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dmy = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

/** Whole days between `d` and now, negative when `d` is in the future. */
const daysAgo = (d: Date | string) =>
  Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

export async function searchAdmin(
  rawQuery: string,
  propertyId?: string | null
): Promise<SearchSection[]> {
  const q = rawQuery.trim();
  // Two characters is the floor: a single letter matches most of the building
  // and the result is a list nobody can read.
  if (q.length < 2) return [];

  const like = { contains: q, mode: "insensitive" as const };
  const inProperty = propertyId ? { property_id: propertyId } : {};
  const take = 6;

  const [units, people, invoices, tickets, visitors, facilities, announcements] =
    await Promise.all([
      prisma.unit.findMany({
        where: { ...inProperty, unit_number: like },
        select: {
          unit_id: true,
          unit_number: true,
          status: true,
          floor_number: true,
          leases: {
            where: { status: "Active" },
            select: { tenant: { select: { user_name: true } } },
            take: 1,
          },
        },
        orderBy: { unit_number: "asc" },
        take,
      }),

      prisma.user.findMany({
        where: {
          role: { not: "Admin" },
          AND: [
            { OR: [{ user_name: like }, { user_email: like }, { phone_number: like }] },
            ...(propertyId
              ? [{ tenant_leases: { some: { unit: { property_id: propertyId } } } }]
              : []),
          ],
        },
        select: {
          user_id: true,
          user_name: true,
          user_email: true,
          phone_number: true,
          tenant_leases: {
            where: { status: "Active" },
            select: { unit: { select: { unit_number: true } } },
            take: 1,
          },
        },
        orderBy: { user_name: "asc" },
        take,
      }),

      prisma.invoice.findMany({
        where: {
          invoice_no: like,
          ...(propertyId ? { lease: { unit: { property_id: propertyId } } } : {}),
        },
        select: {
          invoice_id: true,
          invoice_no: true,
          total_amount: true,
          due_date: true,
          status: true,
          lease: { select: { unit: { select: { unit_number: true } } } },
        },
        orderBy: { invoice_date: "desc" },
        take,
      }),

      prisma.ticket.findMany({
        where: {
          ...inProperty,
          OR: [{ ticket_no: like }, { title: like }, { location_detail: like }],
          // (no second OR here — `inProperty` is a plain property_id)
        },
        select: {
          ticket_id: true,
          ticket_no: true,
          title: true,
          status: true,
          priority: true,
          assigned_to: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take,
      }),

      prisma.visitor.findMany({
        where: {
          // AND-ed deliberately. Writing `OR` twice in one object literal
          // silently drops the first — the property scope would have
          // replaced the name match and returned every visitor in the
          // building.
          AND: [
            { OR: [{ visitor_name: like }, { vehicle_plate: like }] },
            ...(propertyId
              ? [
                  {
                    OR: [
                      { property_id: propertyId },
                      { lease: { unit: { property_id: propertyId } } },
                    ],
                  },
                ]
              : []),
          ],
        },
        select: {
          visitor_id: true,
          visitor_name: true,
          vehicle_plate: true,
          status: true,
          visit_date: true,
        },
        orderBy: { visit_date: "desc" },
        take: 4,
      }),

      prisma.facility.findMany({
        where: { ...inProperty, facility_name: like },
        select: { facility_id: true, facility_name: true, facility_type: true },
        orderBy: { facility_name: "asc" },
        take: 4,
      }),

      prisma.announcement.findMany({
        where: { ...(propertyId ? { property_id: propertyId } : {}), title: like },
        select: { announcement_id: true, title: true, category: true, publish_date: true },
        orderBy: { publish_date: "desc" },
        take: 4,
      }),
    ]);

  /*
   * What is owed, per matched unit. This is the whole reason a unit result is
   * worth more than a link: "A-12-07" tells an admin nothing they did not
   * already know, and "A-12-07 · owes RM 4,820" ends the phone call.
   *
   * One grouped query over the matched units only, not the whole building.
   */
  const unitIds = units.map((u) => u.unit_id);
  const owed = new Map<string, number>();
  const openTickets = new Map<string, number>();

  if (unitIds.length) {
    const [dues, tix] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          status: { notIn: ["Paid", "Inactive", "Void"] },
          lease: { unit_id: { in: unitIds } },
        },
        select: { total_amount: true, lease: { select: { unit_id: true } } },
      }),
      prisma.ticket.groupBy({
        by: ["unit_id"],
        where: { unit_id: { in: unitIds }, status: { in: OPEN_STATUSES } },
        _count: { _all: true },
      }),
    ]);
    for (const d of dues) {
      const id = d.lease?.unit_id;
      if (!id) continue;
      // AGENTS.md Rule 6 — Decimal must not reach a client component.
      owed.set(id, (owed.get(id) ?? 0) + Number(d.total_amount));
    }
    for (const t of tix) if (t.unit_id) openTickets.set(t.unit_id, t._count._all);
  }

  const sections: SearchSection[] = [];

  if (units.length) {
    sections.push({
      heading: units.length === 1 ? "The unit" : "Units",
      hits: units.map((u) => {
        const due = owed.get(u.unit_id) ?? 0;
        const open = openTickets.get(u.unit_id) ?? 0;
        const tenant = u.leases[0]?.tenant?.user_name;
        const bits = [
          tenant ?? (u.status === "Vacant" ? "Nobody in it" : "No active tenancy"),
          `Floor ${u.floor_number}`,
        ];
        if (open) bits.push(`${open} open repair${open === 1 ? "" : "s"}`);
        return {
          id: u.unit_id,
          icon: "home_work",
          title: u.unit_number,
          sub: bits.join(" · "),
          href: `/admin/units/${u.unit_id}`,
          tag: due > 0 ? `Owes ${money(due)}` : undefined,
          tone: due > 0 ? ("bad" as const) : undefined,
        };
      }),
    });
  }

  if (invoices.length) {
    sections.push({
      heading: "Invoices",
      hits: invoices.map((i) => {
        const late = i.status !== "Paid" && daysAgo(i.due_date) > 0;
        return {
          id: i.invoice_id,
          icon: "receipt_long",
          title: i.invoice_no,
          sub: `${i.lease?.unit?.unit_number ?? "No unit"} · ${money(Number(i.total_amount))} · due ${dmy(
            i.due_date
          )}`,
          href: `/admin/invoices?q=${encodeURIComponent(i.invoice_no)}`,
          tag: late ? `${daysAgo(i.due_date)} days overdue` : i.status,
          tone: late ? ("bad" as const) : i.status === "Paid" ? ("good" as const) : undefined,
        };
      }),
    });
  }

  if (tickets.length) {
    sections.push({
      heading: "Repairs",
      hits: tickets.map((t) => {
        const open = OPEN_STATUSES.includes(t.status);
        return {
          id: t.ticket_id,
          icon: "build",
          title: ticketRef(t),
          sub: `${t.title} · reported ${daysAgo(t.created_at)} days ago`,
          href: `/admin/maintenance/${t.ticket_id}`,
          tag: open && !t.assigned_to ? "Nobody on it" : t.status,
          tone: open && !t.assigned_to ? ("warn" as const) : open ? undefined : ("good" as const),
        };
      }),
    });
  }

  if (people.length) {
    sections.push({
      heading: "Residents",
      hits: people.map((p) => ({
        id: p.user_id,
        icon: "person",
        title: p.user_name,
        sub: [p.phone_number, p.tenant_leases[0]?.unit?.unit_number, p.user_email]
          .filter(Boolean)
          .join(" · "),
        href: `/admin/tenants?q=${encodeURIComponent(p.user_name)}`,
      })),
    });
  }

  if (visitors.length) {
    sections.push({
      heading: "Visitors",
      hits: visitors.map((v) => ({
        id: v.visitor_id,
        icon: "badge",
        title: v.visitor_name,
        sub: [v.vehicle_plate, v.visit_date ? dmy(v.visit_date) : null].filter(Boolean).join(" · "),
        href: `/admin/visitors?q=${encodeURIComponent(v.visitor_name)}`,
        tag: v.status === "Checked In" ? "On site" : undefined,
        tone: v.status === "Checked In" ? ("good" as const) : undefined,
      })),
    });
  }

  if (facilities.length || announcements.length) {
    sections.push({
      heading: "Also matching",
      hits: [
        ...facilities.map((f) => ({
          id: f.facility_id,
          icon: "pool",
          title: f.facility_name,
          sub: f.facility_type,
          href: "/admin/facilities",
        })),
        ...announcements.map((a) => ({
          id: a.announcement_id,
          icon: "campaign",
          title: a.title,
          sub: `${a.category} · ${dmy(a.publish_date)}`,
          href: "/admin/announcements",
        })),
      ],
    });
  }

  return sections;
}
