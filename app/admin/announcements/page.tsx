import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllAnnouncements } from "@/lib/announcements";
import AdminAnnouncementList, { AnnouncementRecord } from "./AdminAnnouncementList";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ propertyId?: string }> | { propertyId?: string };
}) {
  const user = await requireUser(["Admin"]);

  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const queryPropertyId = resolvedSearchParams?.propertyId;

  // Fetch all managed properties
  const properties = await prisma.propertyMaster.findMany({
    select: { property_id: true, property_name: true, is_default: true },
    orderBy: { property_name: "asc" },
  });

  // Resolve default property
  const defaultProp = properties.find((p) => p.is_default) || properties[0];
  const activePropertyId = queryPropertyId && queryPropertyId !== "ALL"
    ? queryPropertyId
    : defaultProp?.property_id;

  // Fetch all announcements (universal + scoped to active property if selected)
  const announcements = await getAllAnnouncements({
    propertyId: queryPropertyId === "ALL" ? undefined : activePropertyId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[28px]">campaign</span>
            <span>Announcements & Circulars</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Broadcast emergency alerts, maintenance disruption advisories, and community news
          </p>
        </div>
      </div>

      {/* Main List and Manager */}
      <AdminAnnouncementList
        announcements={announcements as unknown as AnnouncementRecord[]}
        properties={properties}
        defaultPropertyId={activePropertyId}
      />
    </div>
  );
}
