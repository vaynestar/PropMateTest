import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminVisitorForm from "./AdminVisitorForm";
import AdminVisitorList from "./AdminVisitorList";
import { getAllVisitors } from "@/lib/visitor-management";
import ScanButton from "@/components/visitors/ScanButton";

export const dynamic = "force-dynamic";

export default async function AdminVisitorsPage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;

  const [visitors, properties, leases] = await Promise.all([
    getAllVisitors(propertyId),
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true, is_default: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.tenantLease.findMany({
      where: { status: "Active" },
      include: {
        unit: {
          select: {
            unit_id: true,
            unit_number: true,
            property_id: true,
          },
        },
        tenant: { select: { user_name: true } },
      },
      orderBy: { unit: { unit_number: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Visitors Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage visitor passes, contractors, deliveries, and gate access verification
          </p>
        </div>
        <ScanButton />
      </div>

      <ExpandableForm title="Register Walk-in Visitor / Contractor" buttonLabel="New Visitor" defaultOpen={false}>
        <AdminVisitorForm
          leases={leases}
          properties={properties}
          defaultPropertyId={propertyId}
        />
      </ExpandableForm>

      <div className="pt-2">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
          <span>Visitor Directory & Access Log</span>
        </h2>
        <AdminVisitorList visitors={visitors} />
      </div>
    </div>
  );
}
