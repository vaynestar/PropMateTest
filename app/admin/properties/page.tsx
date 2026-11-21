import { requireUser } from "@/lib/auth";
import { listProperties } from "@/lib/property-management";
import PropertiesClient from "@/components/properties/PropertiesClient";
import { getActivePropertyId } from "@/lib/property-context.server";
import { PageHeader } from "@/components/admin/ui";
import { OPEN_STATUSES } from "@/lib/ticket-states";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  await requireUser(["Admin"]);

  /*
   * A property used to be a name and an address (DEV-262). That told an
   * administrator nothing about which building needed them this morning, and
   * the four numbers that do — how many units, how full, how much is owed,
   * how many repairs are open — were each a separate screen away.
   *
   * Owed is reduced in memory rather than grouped in SQL because an invoice
   * reaches its property through lease ➔ unit ➔ property, and Prisma's
   * groupBy cannot traverse a relation. At this scale that is one query and
   * a loop, not a problem worth a raw statement.
   */
  const [properties, unpaid, openTickets] = await Promise.all([
    listProperties(),
    prisma.invoice.findMany({
      where: { status: { notIn: ["Paid", "Inactive"] } },
      select: {
        total_amount: true,
        lease: { select: { unit: { select: { property_id: true } } } },
      },
    }),
    prisma.ticket.groupBy({
      by: ["property_id"],
      where: { status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
  ]);

  const owedByProperty: Record<string, number> = {};
  for (const inv of unpaid) {
    const pid = inv.lease?.unit?.property_id;
    if (!pid) continue;
    // Rule 6: total_amount is a Prisma Decimal.
    owedByProperty[pid] = (owedByProperty[pid] ?? 0) + Number(inv.total_amount ?? 0);
  }

  const repairsByProperty: Record<string, number> = {};
  for (const row of openTickets) {
    if (row.property_id) repairsByProperty[row.property_id] = row._count._all;
  }

  const activePropertyId = (await getActivePropertyId()) ?? "";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Properties"
        subtitle="The buildings this office manages. The one marked default is what you land on when you sign in."
      />

      <PropertiesClient
        initialProperties={properties as any}
        activePropertyId={activePropertyId}
        owedByProperty={owedByProperty}
        repairsByProperty={repairsByProperty}
      />
    </div>
  );
}
