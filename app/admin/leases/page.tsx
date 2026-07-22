import { cookies } from "next/headers";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminLeaseForm from "./AdminLeaseForm";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getAllLeases } from "@/lib/lease-management";
import { listPropertiesForUnits, listUnits } from "@/lib/unit-management";
import LocalLeaseFilters from "@/components/layout/LocalLeaseFilters";

export const dynamic = "force-dynamic";

export default async function AdminLeasesPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const searchParams = await props.searchParams;
  const urlPropertyId = searchParams.property as string | undefined;
  const urlTenantId = searchParams.tenant as string | undefined;
  const cookiePropertyId = cookieStore.get("propmate_property_id")?.value;

  const properties = await listPropertiesForUnits();
  const activePropertyId = urlPropertyId || cookiePropertyId || (properties[0]?.property_id ?? null);

  const [leases, units, filteredTenant] = await Promise.all([
    getAllLeases(activePropertyId || undefined, urlTenantId),
    listUnits(activePropertyId || undefined),
    urlTenantId ? prisma.user.findUnique({ where: { user_id: urlTenantId }, select: { user_name: true } }) : null
  ]);
  
  const users = await prisma.user.findMany({
    where: { role: "Resident" },
    orderBy: { user_name: "asc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leases</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Manage unit tenancies and resident assignments
          </p>
        </div>
      </div>

      <ExpandableForm title="Create New Lease" buttonLabel="Add Lease" defaultOpen={false}>
        <AdminLeaseForm units={units} users={users} />
      </ExpandableForm>

      {filteredTenant && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between animate-slide-in">
          <div className="flex items-center gap-2 text-primary font-medium">
            <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            <span>Showing leases for tenant: <strong>{filteredTenant.user_name}</strong></span>
          </div>
          <Link
            href="/admin/leases"
            className="px-3 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Clear Filter
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#4a4455]">
        <h2 className="text-xl font-semibold text-white">
          Active & Past Leases
        </h2>
        <LocalLeaseFilters
          properties={properties}
          activePropertyId={activePropertyId}
          tenants={users}
          activeTenantId={urlTenantId || null}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leases.length === 0 ? (
          <div className="col-span-full p-8 text-center text-on-surface-variant border border-dashed border-[#4a4455] rounded-xl">
            No leases found.
          </div>
        ) : (
          leases.map((l) => (
            <div key={l.lease_id} className="bg-surface-container border border-[#4a4455] rounded-xl p-5 shadow-lg relative group hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white truncate max-w-[200px]" title={l.tenant.user_name}>
                    {l.tenant.user_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                    {l.unit.property.property_name} - Unit {l.unit.unit_number}
                  </p>
                </div>
                <StatusBadge status={l.status || "Active"} />
              </div>
              
              <div className="space-y-2 mt-4 text-sm text-on-surface-variant border-t border-[#4a4455]/50 pt-4">
                <div className="flex justify-between">
                  <span>Move-in</span>
                  <span className="text-white">
                    {l.move_in_date ? new Date(l.move_in_date).toLocaleDateString("en-GB") : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Move-out</span>
                  <span className="text-white">
                    {l.move_out_date ? new Date(l.move_out_date).toLocaleDateString("en-GB") : "Current"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phone</span>
                  <span className="text-white font-mono">{l.tenant.phone_number || "-"}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#4a4455]/50">
                <Link
                  href={`/admin/leases/${l.lease_id}/charges`}
                  className="w-full btn-outline py-2 flex items-center justify-center gap-2 text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  Setup Invoice Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
