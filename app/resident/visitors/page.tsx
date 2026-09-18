import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import VisitorForm from "./VisitorForm";
import ExpandableForm from "@/components/layout/ExpandableForm";
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

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const rows = visitors.map((v) => ({
    ...v,
    // YYYY-MM-DD as stored (a @db.Date comes back as UTC midnight).
    visit_iso: v.visit_date ? new Date(v.visit_date).toISOString().slice(0, 10) : null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[26px]">badge</span>
          Visitors
        </h1>
        <p className="text-sm text-on-surface-variant">
          Create a pass before your guest arrives. The guard scans its QR code at the gate.
        </p>
      </section>

      {!lease ? (
        <div className="p-6 glass-card rounded-2xl text-center text-on-surface-variant flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-4xl opacity-60 text-amber-400">warning</span>
          <p className="font-semibold text-on-surface">No active tenancy</p>
          <p className="text-xs">You need an active lease to create visitor passes.</p>
        </div>
      ) : (
        <ExpandableForm title="Create a visitor pass" buttonLabel="New Visitor" defaultOpen={visitors.length === 0}>
          <VisitorForm />
        </ExpandableForm>
      )}

      <ResidentVisitorList visitors={rows} today={today} />
    </div>
  );
}
