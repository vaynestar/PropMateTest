import Link from "next/link";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import TenantForm from "./TenantForm";
import TenantListFilter from "@/components/layout/TenantListFilter";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireUser(["Admin"]);

  const [tenants, properties] = await Promise.all([
    prisma.user.findMany({
      where: { role: "Resident" },
      orderBy: { created_at: "desc" },
      include: {
        tenant_leases: {
          include: {
            unit: {
              include: {
                property: true
              }
            }
          }
        }
      }
    }),
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true },
      orderBy: { property_name: "asc" }
    })
  ]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Tenants
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage your resident accounts globally across all properties.
          </p>
        </div>
      </div>

      <ExpandableForm title="Add New Tenant" buttonLabel="New Tenant">
        <TenantForm />
      </ExpandableForm>

      <TenantListFilter tenants={tenants} properties={properties} />
    </div>
  );
}
