import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import VisitorForm from "./VisitorForm";
import StatusBadge from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ResidentVisitorsPage() {
  const user = await requireUser(["Resident"]);

  // Get active lease for resident
  const lease = await prisma.tenantLease.findFirst({
    where: { user_id: user.userId, status: "Active" },
  });

  let visitors: any[] = [];
  if (lease) {
    visitors = await prisma.visitor.findMany({
      where: { lease_id: lease.lease_id },
      orderBy: { visit_date: "desc" },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Visitors</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Register expected visitors to streamline guard house entry
          </p>
        </div>
      </div>

      {!lease ? (
        <div className="p-6 bg-surface-variant border border-[#4a4455] rounded-xl text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">warning</span>
          <p>You don't have an active lease to register visitors.</p>
        </div>
      ) : (
        <VisitorForm />
      )}

      {/* Visitor History */}
      <h2 className="text-xl font-semibold text-white pt-4 border-t border-[#4a4455]">
        Visitor History
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visitors.length === 0 ? (
          <div className="col-span-full p-8 text-center text-on-surface-variant border border-dashed border-[#4a4455] rounded-xl">
            No visitors registered yet.
          </div>
        ) : (
          visitors.map((v) => (
            <div key={v.visitor_id} className="bg-surface-container border border-[#4a4455] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white truncate max-w-[200px]" title={v.visitor_name}>
                    {v.visitor_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                    IC/Passport: {v.visitor_ic_no}
                  </p>
                </div>
                <StatusBadge status={v.status || "Pending"} />
              </div>
              
              <div className="space-y-2 mt-4 text-sm text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">calendar_today</span>
                  {v.visit_date ? v.visit_date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  }) : "-"}
                </div>
                {v.vehicle_plate && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">directions_car</span>
                    {v.vehicle_plate}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span className="truncate" title={v.visit_purpose || "No purpose stated"}>
                    {v.visit_purpose || "No purpose stated"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
