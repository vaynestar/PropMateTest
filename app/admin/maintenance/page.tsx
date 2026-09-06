import { requireUser } from "@/lib/auth";
import { listTickets, listTicketCategories } from "@/lib/maintenance";
import { listUnits } from "@/lib/unit-management";
import { listProperties } from "@/lib/property-management";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminTicketTable from "@/components/maintenance/AdminTicketTable";
import AdminRaiseTicketForm from "@/components/maintenance/AdminRaiseTicketForm";
import CategoryMasterManager from "@/components/maintenance/CategoryMasterManager";
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
    prisma.user.findMany({ where: { role: "Admin" }, select: { user_id: true, user_name: true } }),
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

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Top Header & Infographic Summary Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Helpdesk
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Repairs and complaints for {activePropName} — what is outstanding, who is on
            it, and what it cost.
          </p>
        </div>

        {/* What is outstanding here, and what needs a decision. */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-card flex min-w-[150px] items-center gap-3 rounded-xl border border-outline-variant/30 px-4 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/20 text-indigo-300">
              <span className="material-symbols-outlined text-[22px]">assignment</span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-on-surface-variant">Still open</span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                {openCount}
              </span>
            </div>
          </div>

          <div
            className={`glass-card flex min-w-[150px] items-center gap-3 rounded-xl border px-4 py-2.5 ${
              urgentCount > 0 ? "border-rose-500/40" : "border-outline-variant/30"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/20 text-rose-300">
              <span className="material-symbols-outlined text-[22px]">priority_high</span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-on-surface-variant">
                High or urgent
              </span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                {urgentCount}
              </span>
            </div>
          </div>

          <div
            className={`glass-card flex min-w-[150px] items-center gap-3 rounded-xl border px-4 py-2.5 ${
              unassignedCount > 0 ? "border-amber-500/40" : "border-outline-variant/30"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/20 text-amber-300">
              <span className="material-symbols-outlined text-[22px]">person_off</span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-on-surface-variant">
                Nobody assigned
              </span>
              <span className="font-headline-md text-headline-md font-bold text-on-surface">
                {unassignedCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Masterfile Settings */}
      <CategoryMasterManager categories={categories} />

      {/* Raise New Ticket Expandable Form with Property Filter */}
      <ExpandableForm title="Raise New Ticket" buttonLabel="New Ticket">
        <AdminRaiseTicketForm
          properties={properties}
          occupiedUnits={unitsForClient}
          categories={categories}
          defaultPropertyId={activePropId}
        />
      </ExpandableForm>

      {/* Helpdesk Tickets Master Table */}
      <AdminTicketTable
        tickets={ticketsForClient}
        admins={admins}
        properties={properties}
        defaultPropertyId={activePropId}
      />
    </div>
  );
}
