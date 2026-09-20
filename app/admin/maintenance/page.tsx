import { requireUser } from "@/lib/auth";
import { listTickets, listTicketCategories } from "@/lib/maintenance";
import { listUnits } from "@/lib/unit-management";
import { listProperties } from "@/lib/property-management";
import AdminTicketTable from "@/components/maintenance/AdminTicketTable";
import RaiseTicketButton from "@/components/maintenance/RaiseTicketButton";
import CategoryMasterManager from "@/components/maintenance/CategoryMasterManager";
import BarList from "@/components/dashboard/BarList";
import { PageHeader, SectionCard, StatCard, StatGrid } from "@/components/admin/ui";
import { colourFor } from "@/lib/chart-colours";
import prisma from "@/lib/prisma";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? "";

  /*
   * The active property was resolved as `is_default` FIRST, then the cookie -
   * which is exactly the bug DEV-128 fixed in the layout. With any property
   * marked default, the top bar did nothing here: switch to Desa Harmoni and
   * the KPI card, the ticket form and the table filter all stayed on Testing.
   * getActivePropertyId() already applies the correct precedence
   * (?property= -> cookie -> is_default -> first), so its answer is used as-is.
   */
  const [tickets, units, properties, admins, categories] = await Promise.all([
    listTickets(propertyId || undefined),
    listUnits(),
    listProperties(),
    // Only active admins: a ticket is assigned to someone who can act on it,
    // and a deactivated account cannot (DEV-198).
    prisma.user.findMany({
      where: { role: "Admin", is_active: true },
      select: { user_id: true, user_name: true },
      orderBy: { user_name: "asc" },
    }),
    listTicketCategories(),
  ]);

  const activeProperty = properties.find((p) => p.property_id === propertyId) || properties[0];
  const activePropId = activeProperty?.property_id || propertyId;
  const activePropName = activeProperty?.property_name || "Active Property";

  /*
   * A ticket can be raised against any unit in the property, not only an
   * occupied one. Maintenance between tenancies - repainting, a leaking pipe
   * found on inspection - is exactly when a vacant unit needs a ticket, and
   * filtering to Occupied made those unreportable.
   */
  const propertyUnits = units.filter((u) => u.property_id === activePropId);

  // Open means someone still has work to do on it.
  const isUnresolved = (status: string) =>
    ["Open", "In Progress", "Pending Parts", "KIV"].includes(status);

  const openTickets = tickets.filter((t) => isUnresolved(t.status));
  const openCount = openTickets.length;
  const urgentCount = openTickets.filter(
    (t) => t.priority === "Urgent" || t.priority === "High"
  ).length;
  const unassignedCount = openTickets.filter((t) => !t.assigned_to).length;

  // AGENTS.md Rule 6: Prisma Decimal cannot cross into a Client Component.
  // Ticket.cost, and unit.area_sqft / monthly_rent on the nested unit, were
  // reaching the table and the form raw - 279 console errors per load.
  const ticketsForClient = tickets.map((t: any) => ({
    ...t,
    messageCount: t._count?.comments ?? 0,
    cost: t.cost === null || t.cost === undefined ? null : Number(t.cost),
    unit: t.unit
      ? {
          unit_id: t.unit.unit_id,
          unit_number: t.unit.unit_number,
          property_id: t.unit.property_id,
          property: t.unit.property
            ? {
                property_id: t.unit.property.property_id,
                property_name: t.unit.property.property_name,
              }
            : null,
        }
      : null,
    lease: t.lease
      ? {
          lease_id: t.lease.lease_id,
          tenant: t.lease.tenant ? { user_name: t.lease.tenant.user_name } : null,
          unit: t.lease.unit
            ? {
                unit_id: t.lease.unit.unit_id,
                unit_number: t.lease.unit.unit_number,
                property_id: t.lease.unit.property_id,
                property: t.lease.unit.property
                  ? {
                      property_id: t.lease.unit.property.property_id,
                      property_name: t.lease.unit.property.property_name,
                    }
                  : null,
              }
            : null,
        }
      : null,
  }));

  const unitsForClient = propertyUnits.map((u: any) => ({
    unit_id: u.unit_id,
    unit_number: u.unit_number,
    property_id: u.property_id,
    status: u.status,
  }));

  // How long the open ones have been waiting - the question a queue cannot
  // answer by its length alone.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const AGE = [
    { label: "Today", max: 1 },
    { label: "1-3 days", max: 4 },
    { label: "4-7 days", max: 8 },
    { label: "Over a week", max: Infinity },
  ];
  const ageing = AGE.map((b) => ({ label: b.label, count: 0 }));
  openTickets.forEach((t: any) => {
    const age = Math.floor((startOfToday.getTime() - new Date(t.created_at).setHours(0, 0, 0, 0)) / 86_400_000);
    const i = AGE.findIndex((b) => age < b.max);
    ageing[i === -1 ? AGE.length - 1 : i].count++;
  });

  const byStatus = ["Open", "In Progress", "Pending Parts", "KIV", "Resolved", "Closed"]
    .map((label) => ({ label, count: tickets.filter((t: any) => t.status === label).length }))
    .filter((r) => r.count > 0);

  const resolvedThisMonth = tickets.filter((t: any) => {
    if (!["Resolved", "Closed"].includes(t.status)) return false;
    const d = new Date(t.modified_at ?? t.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Helpdesk"
        subtitle={`Repairs and complaints for ${activePropName} — what is outstanding, who is on it, and what it cost.`}
        actions={
          <>
            <CategoryMasterManager categories={categories} />
            <RaiseTicketButton
              properties={properties}
              occupiedUnits={unitsForClient}
              categories={categories}
              defaultPropertyId={activePropId}
            />
          </>
        }
      />

      <StatGrid>
        <StatCard label="Still open" value={openCount} hint="unresolved" icon="assignment" tone={openCount > 0 ? "primary" : "neutral"} />
        <StatCard
          label="High or urgent"
          value={urgentCount}
          hint="of the open ones"
          icon="priority_high"
          tone={urgentCount > 0 ? "critical" : "neutral"}
        />
        <StatCard
          label="Nobody assigned"
          value={unassignedCount}
          hint="needs an owner"
          icon="person_off"
          tone={unassignedCount > 0 ? "warning" : "neutral"}
        />
        <StatCard label="Closed this month" value={resolvedThisMonth} hint="resolved or closed" icon="task_alt" tone="positive" />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Where the tickets sit" subtitle="Every ticket in this property, by status" icon="donut_small">
          <BarList rows={byStatus} colourOf={colourFor} emptyText="No tickets yet." />
        </SectionCard>
        <SectionCard title="How long they have waited" subtitle="Open tickets by age" icon="hourglass_top">
          <BarList
            rows={ageing}
            colourOf={(l) =>
              l === "Over a week" ? "#fb7185" : l === "4-7 days" ? "#fbbf24" : l === "1-3 days" ? "#8b5cf6" : "#34d399"
            }
            emptyText="Nothing open."
          />
        </SectionCard>
      </div>

      <AdminTicketTable
        tickets={ticketsForClient}
        admins={admins}
        properties={properties}
        defaultPropertyId={activePropId}
      />
    </div>
  );
}
