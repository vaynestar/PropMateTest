import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getResidentAnnouncements } from "@/lib/announcements";
import ResidentAnnouncementList, { ResidentAnnouncement } from "@/components/announcements/ResidentAnnouncementList";

export const dynamic = "force-dynamic";

export default async function ResidentAnnouncementsPage() {
  const user = await requireUser(["Resident"]);

  // Get active lease for resident
  const lease = await prisma.tenantLease.findFirst({
    where: { user_id: user.userId, status: "Active" },
    include: {
      unit: {
        include: {
          property: { select: { property_id: true, property_name: true } },
        },
      },
    },
  });

  if (!lease) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">campaign</span>
            <span>Notice Board & Circulars</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Community announcements, service disruptions, and management circulars
          </p>
        </div>

        <div className="p-8 bg-surface-container border border-outline-variant/60 rounded-2xl text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl opacity-50 text-amber-400">warning</span>
          <p className="font-semibold text-white">No Active Lease Found</p>
          <p className="text-xs">You need an active tenancy lease to access your building notice board.</p>
        </div>
      </div>
    );
  }

  const propertyId = lease.unit.property.property_id;
  const propertyName = lease.unit.property.property_name;

  const announcements = await getResidentAnnouncements(propertyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">campaign</span>
            <span>Community Notice Board</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Official announcements, emergency advisories, and circulars for {propertyName}
          </p>
        </div>
      </div>

      {/* Main Notice Board Feed */}
      <ResidentAnnouncementList
        announcements={announcements as unknown as ResidentAnnouncement[]}
        propertyName={propertyName}
      />
    </div>
  );
}
