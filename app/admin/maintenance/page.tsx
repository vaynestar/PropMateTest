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

  const [tickets, units, properties, admins, categories] = await Promise.all([
    listTickets(),
    listUnits(),
    listProperties(),
    prisma.user.findMany({ where: { role: "Admin" }, select: { user_id: true, user_name: true } }),
    listTicketCategories(),
  ]);

  const occupiedUnits = units.filter((u) => u.status === "Occupied");

  // Determine effective active property name & ID
  const activeProperty =
    properties.find((p) => p.is_default) ||
    properties.find((p) => p.property_id === propertyId) ||
    properties[0];
  const activePropId = activeProperty?.property_id || propertyId;
  const activePropName = activeProperty?.property_name || "Active Property";

  // Count active open/unresolved tickets (Open, In Progress, Pending Parts, KIV)
  const isUnresolved = (status: string) =>
    ["Open", "In Progress", "Pending Parts", "KIV"].includes(status);

  const allOpenCount = tickets.filter((t) => isUnresolved(t.status)).length;
  const activePropOpenCount = tickets.filter(
    (t) =>
      isUnresolved(t.status) &&
      (t.property_id === activePropId ||
        t.lease?.unit?.property_id === activePropId ||
        t.unit?.property_id === activePropId)
  ).length;

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Top Header & Infographic Summary Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Helpdesk
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Raise, track, and manage maintenance tickets & category masterfiles.
          </p>
        </div>

        {/* 2 Infographic KPI Cards */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Box 1: All Properties */}
          <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3 border border-outline-variant/30 min-w-[170px]">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">domain</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider">
                All Properties
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  {allOpenCount}
                </span>
                <span className="text-xs text-indigo-400 font-semibold">open</span>
              </div>
            </div>
          </div>

          {/* Box 2: Current Active Property */}
          <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3 border border-outline-variant/30 min-w-[170px]">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant block uppercase tracking-wider truncate max-w-[110px]" title={activePropName}>
                {activePropName}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-md text-headline-md text-on-surface font-bold">
                  {activePropOpenCount}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">open</span>
              </div>
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
          occupiedUnits={occupiedUnits}
          categories={categories}
          defaultPropertyId={activePropId}
        />
      </ExpandableForm>

      {/* Helpdesk Tickets Master Table */}
      <AdminTicketTable
        tickets={tickets}
        admins={admins}
        properties={properties}
        defaultPropertyId={activePropId}
      />
    </div>
  );
}
