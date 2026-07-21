import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminVisitorForm from "./AdminVisitorForm";
import AdminVisitorList from "./AdminVisitorList";
import { getAllVisitors } from "@/lib/visitor-management";

export const dynamic = "force-dynamic";

export default async function AdminVisitorsPage() {
  await requireUser(["Admin"]);

  const visitors = await getAllVisitors();

  // Get active leases for the admin to select from when registering a visitor manually
  const leases = await prisma.tenantLease.findMany({
    where: { status: "Active" },
    include: {
      unit: true,
      tenant: { select: { user_name: true } },
    },
    orderBy: { unit: { unit_number: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Visitors Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage resident visitors and approve entry
          </p>
        </div>
      </div>

      <ExpandableForm title="Register Walk-in Visitor" buttonLabel="New Visitor" defaultOpen={false}>
        <AdminVisitorForm leases={leases} />
      </ExpandableForm>

      <h2 className="text-xl font-semibold text-white pt-4 border-t border-[#4a4455]">
        Recent Visitors
      </h2>
      
      <AdminVisitorList visitors={visitors} />
    </div>
  );
}
