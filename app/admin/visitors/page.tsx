import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import AdminVisitorList from "./AdminVisitorList";
import RegisterVisitorButton from "@/components/visitors/RegisterVisitorButton";
import { PageHeader } from "@/components/admin/ui";
import { getAllVisitors } from "@/lib/visitor-management";
import ScanButton from "@/components/visitors/ScanButton";
import { getActivePropertyId } from "@/lib/property-context.server";

export const dynamic = "force-dynamic";

export default async function AdminVisitorsPage() {
  await requireUser(["Admin"]);
  const propertyId = (await getActivePropertyId()) ?? undefined;

  const [visitors, properties, leases] = await Promise.all([
    getAllVisitors(propertyId),
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true, is_default: true },
      orderBy: { created_at: "asc" },
    }),
    // Scoped: the host picker offered units from every property while the page
    // showed one, so a Testing guard could log a visitor against a Desa Harmoni
    // unit.
    prisma.tenantLease.findMany({
      where: {
        status: "Active",
        ...(propertyId ? { unit: { property_id: propertyId } } : {}),
      },
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
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Visitors"
        subtitle="Who is expected, who is in the building, and who has left."
        actions={
          <>
            <RegisterVisitorButton leases={leases} properties={properties} defaultPropertyId={propertyId} />
            <ScanButton variant="secondary" />
          </>
        }
      />

      <AdminVisitorList visitors={visitors} />
    </div>
  );
}
