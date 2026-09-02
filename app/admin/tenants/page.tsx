import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import TenantsClient from "@/components/tenants/TenantsClient";

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
                property: true,
              },
            },
          },
        },
      },
    }),
    prisma.propertyMaster.findMany({
      select: { property_id: true, property_name: true },
      orderBy: { property_name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Residents & Tenants</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage resident credentials, contact profiles, portal login access, and assigned lease units
          </p>
        </div>
      </div>

      {/* Interactive Tenants Workspace */}
      <TenantsClient
        initialTenants={tenants as any}
        properties={properties}
      />
    </div>
  );
}
