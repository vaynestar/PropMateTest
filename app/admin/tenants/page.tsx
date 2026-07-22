import Link from "next/link";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExpandableForm from "@/components/layout/ExpandableForm";
import TenantForm from "./TenantForm";
import TenantDeleteForm from "./TenantDeleteForm";
import TenantEditForm from "./TenantEditForm";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireUser(["Admin"]);

  const tenants = await prisma.user.findMany({
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
  });

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

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Registered Tenants
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface px-2 py-1 rounded-md">
            {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="p-6">
          {tenants.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
              No tenants found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenants.map((tenant) => (
                <div key={tenant.user_id} className="bg-surface-container border border-outline-variant/50 rounded-xl p-5 shadow-lg flex flex-col hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                        {tenant.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-on-surface">
                          {tenant.user_name}
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          {tenant.user_email}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-on-surface-variant flex-grow mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">phone</span>
                      {tenant.phone_number || "No phone number"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">real_estate_agent</span>
                      {tenant.tenant_leases.length} Active/Past Lease(s)
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant/30">
                    <Link
                      href={`/admin/leases?tenant=${tenant.user_id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium pressable"
                      title="View Leases for this Tenant"
                    >
                      <span className="material-symbols-outlined text-[18px]">real_estate_agent</span>
                      View Leases
                    </Link>
                    <TenantEditForm tenant={tenant} />
                    <TenantDeleteForm userId={tenant.user_id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
