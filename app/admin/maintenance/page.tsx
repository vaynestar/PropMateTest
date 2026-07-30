import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listTickets, listTicketCategories } from "@/lib/maintenance";
import { listUnits } from "@/lib/unit-management";
import { listProperties } from "@/lib/property-management";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminTicketTable from "@/components/maintenance/AdminTicketTable";
import AdminRaiseTicketForm from "@/components/maintenance/AdminRaiseTicketForm";
import CategoryMasterManager from "@/components/maintenance/CategoryMasterManager";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value || "";

  const [tickets, units, properties, admins, categories] = await Promise.all([
    listTickets(),
    listUnits(),
    listProperties(),
    prisma.user.findMany({ where: { role: "Admin" }, select: { user_id: true, user_name: true } }),
    listTicketCategories(),
  ]);

  const occupiedUnits = units.filter((u) => u.status === "Occupied");

  // Count active open/in progress tickets
  const openCount = tickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress" || t.status === "Pending Parts"
  ).length;

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Helpdesk
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Raise, track, and manage maintenance tickets & category masterfiles across your properties.
          </p>
        </div>
        <span className="glass-card rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">support_agent</span>
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant block">
              Active Open Tickets
            </span>
            <span className="font-headline-md text-headline-md text-on-surface font-bold">
              {openCount}
            </span>
          </div>
        </span>
      </div>

      {/* Category Masterfile Settings */}
      <CategoryMasterManager categories={categories} />

      {/* Raise New Ticket Expandable Form with Property Filter */}
      <ExpandableForm title="Raise New Ticket" buttonLabel="New Ticket">
        <AdminRaiseTicketForm
          properties={properties}
          occupiedUnits={occupiedUnits}
          categories={categories}
          defaultPropertyId={propertyId}
        />
      </ExpandableForm>

      {/* Helpdesk Tickets Master Table */}
      <AdminTicketTable
        tickets={tickets}
        admins={admins}
        properties={properties}
        defaultPropertyId={propertyId}
      />
    </div>
  );
}
