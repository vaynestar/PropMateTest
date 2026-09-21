import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllAnnouncements } from "@/lib/announcements";
import AdminAnnouncementList, { AnnouncementRecord } from "./AdminAnnouncementList";
import { getActivePropertyId } from "@/lib/property-context.server";
import { PageHeader } from "@/components/admin/ui";

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

  /*
   * This page never asked which property was selected. It resolved is_default
   * first and never read the cookie at all, so the top bar had no effect here
   * whatsoever - the same DEV-128 fault found in Helpdesk (DEV-149), and the
   * third module to carry it. getActivePropertyId() applies the agreed
   * precedence (?property= -> cookie -> is_default -> first).
   */
  const activePropertyId =
    queryPropertyId && queryPropertyId !== "ALL"
      ? queryPropertyId
      : (await getActivePropertyId()) ?? properties[0]?.property_id;

  // Fetch all announcements (universal + scoped to active property if selected)
  const announcements = await getAllAnnouncements({
    propertyId: queryPropertyId === "ALL" ? undefined : activePropertyId,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <PageHeader
        title="Announcements"
        subtitle="Notices on the resident board — what is up now, what is queued, and what has come down."
      />

      {/* Main List and Manager */}
      <AdminAnnouncementList
        announcements={announcements as unknown as AnnouncementRecord[]}
        properties={properties}
        defaultPropertyId={activePropertyId}
      />
    </div>
  );
}
