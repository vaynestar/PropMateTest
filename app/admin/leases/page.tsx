import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllLeases } from "@/lib/lease-management";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import LeasesClient from "@/components/leases/LeasesClient";

export const dynamic = "force-dynamic";

export default async function AdminLeasesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const searchParams = await props.searchParams;
  const urlPropertyId = searchParams.property as string | undefined;
  const urlTenantId = searchParams.tenant as string | undefined;
  const urlUnitNumber = searchParams.unit as string | undefined;
  const cookiePropertyId = cookieStore.get("propmate_property_id")?.value;

  const properties = await listPropertiesForUnits();
  const activePropertyId =
    urlPropertyId || (urlTenantId ? null : cookiePropertyId || (properties[0]?.property_id ?? null));

  const [leases, units, users] = await Promise.all([
    getAllLeases(
      activePropertyId || undefined,
      urlTenantId,
      undefined,
      true, // fetch all so client can filter seamlessly
      urlUnitNumber
    ),
    listUnits(activePropertyId || undefined),
    prisma.user.findMany({
      where: { role: "Resident" },
      select: { user_id: true, user_name: true, user_email: true },
      orderBy: { user_name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Tenancy Agreements & Leases</h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage unit tenancies, move-in/move-out schedules, resident allocations, and linked billing ledgers
          </p>
        </div>
      </div>

      {/* Interactive Leases Workspace */}
      <LeasesClient
        initialLeases={leases as any}
        properties={properties}
        availableUnits={units as any}
        users={users}
        activePropertyId={activePropertyId}
      />
    </div>
  );
}
