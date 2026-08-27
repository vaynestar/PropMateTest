import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import VisitorForm from "./VisitorForm";
import ResidentVisitorList from "@/components/visitors/ResidentVisitorList";

export const dynamic = "force-dynamic";

export default async function ResidentVisitorsPage() {
  const user = await requireUser(["Resident"]);

  // Get active lease for resident with unit and property relation
  const lease = await prisma.tenantLease.findFirst({
    where: { user_id: user.userId, status: "Active" },
    include: {
      unit: {
        include: {
          property: { select: { property_name: true } },
        },
      },
      tenant: { select: { user_name: true } },
    },
  });

  let visitors: any[] = [];
  if (lease) {
    visitors = await prisma.visitor.findMany({
      where: {
        OR: [
          { lease_id: lease.lease_id },
          { created_by: user.userId },
        ],
      },
      orderBy: [{ visit_date: "desc" }, { created_at: "desc" }],
      include: {
        property: { select: { property_name: true } },
        lease: {
          include: {
            unit: {
              include: {
                property: { select: { property_name: true } },
              },
            },
            tenant: { select: { user_name: true } },
          },
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Visitors Management</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Register expected visitors and generate digital QR passes for guardhouse access
          </p>
        </div>
      </div>

      {!lease ? (
        <div className="p-6 bg-surface-container border border-outline-variant/60 rounded-2xl text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl opacity-50 text-amber-400">warning</span>
          <p className="font-semibold text-white">No Active Lease Found</p>
          <p className="text-xs">You need an active tenancy lease to register visitor access passes.</p>
        </div>
      ) : (
        <VisitorForm />
      )}

      {/* Visitor History */}
      <div className="pt-2">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">history</span>
          <span>Visitor History & Generated QR Passes</span>
        </h2>

        <ResidentVisitorList visitors={visitors} />
      </div>
    </div>
  );
}
