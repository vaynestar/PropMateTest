import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import VisitorForm from "./VisitorForm";
import StatusBadge from "@/components/dashboard/StatusBadge";
import VisitorQRCode from "@/components/visitors/VisitorQRCode";

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
      
      <div className="flex flex-col gap-stack-md w-full">
        {visitors.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant glass-card rounded-xl">
            No visitors registered yet.
          </div>
        ) : (
          visitors.map((v) => (
            <div
              key={v.visitor_id}
              className="glass-card rounded-xl p-4 flex flex-col gap-3 w-full"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-label-md">
                    {v.visitor_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3
                      className="font-title-lg text-title-lg text-on-surface truncate max-w-[150px]"
                      title={v.visitor_name}
                    >
                      {v.visitor_name}
                    </h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
                      IC: {v.visitor_ic_no}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={v.status || "Pending"} />
                  {v.status === "Approved" && (
                    <div className="flex flex-col items-center">
                      <VisitorQRCode value={v.visitor_id} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center w-full mt-2 pt-3 border-t border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-body-md text-body-md text-on-surface-variant">
                    {v.visit_date
                      ? v.visit_date.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                  {v.vehicle_plate && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mt-1">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "14px" }}
                      >
                        directions_car
                      </span>
                      {v.vehicle_plate}
                    </span>
                  )}
                </div>
                <span
                  className="font-label-md text-label-md text-primary max-w-[120px] truncate text-right"
                  title={v.visit_purpose || "No purpose stated"}
                >
                  {v.visit_purpose || "Guest"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
