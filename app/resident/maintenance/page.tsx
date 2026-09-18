import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData, getResidentTickets } from "@/lib/resident";
import { listTicketCategories, raiseTicket } from "@/lib/maintenance";
import { getStorageFolder } from "@/lib/storage/folders";
import { readTicketPhotos } from "@/lib/ticket-photos";
import ExpandableForm from "@/components/layout/ExpandableForm";
import ResidentRaiseTicketForm from "@/components/maintenance/ResidentRaiseTicketForm";
import ResidentTicketList, { type ResidentTicket } from "@/components/maintenance/ResidentTicketList";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "11 Sep 2026" in Malaysia time (Intl gives "Sept"). */
function formatDate(date: Date | string) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
    .format(new Date(date))
    .split("-")
    .map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export default async function ResidentMaintenancePage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [{ lease }, tickets, categories] = await Promise.all([
    getResidentPortalData(user.userId),
    getResidentTickets(user.userId),
    listTicketCategories(),
  ]);

  async function handleRaiseTicket(formData: FormData) {
    "use server";
    const sessionUser = await getSessionUser();
    if (!sessionUser) throw new Error("Unauthorized");

    const propertyId = String(formData.get("property_id") || "");
    const locationType = String(formData.get("location_type") || "Unit");
    const unitId = String(formData.get("unit_id") || "");
    const locationDetail = String(formData.get("location_detail") || "");
    const title = String(formData.get("title") || "");
    const description = String(formData.get("description") || "");
    const ticketCategory = String(formData.get("ticket_category") || "General Maintenance");

    if (!title.trim()) return { error: "Please enter an issue title." };

    /*
     * unit_id and property_id arrive straight from the form, so without this a
     * resident could raise a ticket against a unit they do not occupy simply by
     * posting a different id. The page fills the form from their own lease, but
     * a form is not a guard - the same hole that was open on facility bookings
     * until DEV-144.
     */
    const ownLease = await prisma.tenantLease.findFirst({
      where: { user_id: sessionUser.userId, status: "Active" },
      select: { unit: { select: { unit_id: true, property_id: true } } },
    });
    if (!ownLease?.unit) {
      return { error: "You need an active lease before you can report an issue." };
    }
    if (locationType === "Unit" && unitId && unitId !== ownLease.unit.unit_id) {
      return { error: "You can only report issues for your own unit." };
    }
    if (propertyId && propertyId !== ownLease.unit.property_id) {
      return { error: "You can only report issues in your own property." };
    }

    const photos = readTicketPhotos(
      formData.getAll("attachment"),
      await getStorageFolder("ticket_attachment"),
      sessionUser.userId
    );
    if (!photos.ok) return { error: photos.error };

    try {
      const ticket = await raiseTicket({
        property_id: ownLease.unit.property_id,
        unit_id: locationType === "Unit" ? ownLease.unit.unit_id : undefined,
        location_type: locationType,
        location_detail: locationDetail,
        requester_id: sessionUser.userId,
        title,
        description,
        ticket_category: ticketCategory,
        priority: "Medium",
        createdBy: sessionUser.userId,
      });
      if (photos.photos.length > 0) {
        await prisma.ticketAttachment.createMany({
          data: photos.photos.map((p) => ({
            ticket_id: ticket.ticket_id,
            uploaded_by: sessionUser.userId,
            file_name: p.name,
            file_url: p.path,
            file_type: p.mime,
            file_size: p.size,
            created_by: sessionUser.userId,
          })),
        });
      }
      revalidatePath("/resident/maintenance");
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || "Failed to raise ticket." };
    }
  }

  const activeCategories = categories.filter((c) => c.is_active);

  const list: ResidentTicket[] = tickets.map((t) => {
    const isCommonArea = t.location_type === "Common Area";
    const unitNumber = t.unit?.unit_number || t.lease?.unit?.unit_number;
    return {
      id: t.ticket_id,
      shortId: t.ticket_id.split("-")[0].toUpperCase(),
      title: t.title,
      description: t.description,
      category: t.ticket_category,
      status: t.status,
      remark: t.remark,
      reported: formatDate(t.created_at),
      resolved: t.resolved_at ? formatDate(t.resolved_at) : null,
      where: isCommonArea ? t.location_detail || "Common area" : `Unit ${unitNumber || "N/A"}`,
      isCommonArea,
      photos: t.attachments.map((a) => ({ id: a.attachment_id, name: a.file_name })),
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[26px]">build_circle</span>
          Helpdesk
        </h1>
        <p className="text-sm text-on-surface-variant">
          Report a problem in your unit or a common area, and follow it until it&apos;s fixed.
        </p>
      </section>

      {lease && (
        <ExpandableForm title="Report a problem" buttonLabel="New Request" defaultOpen={false}>
          <ResidentRaiseTicketForm
            unitId={lease.unit.unit_id}
            unitNumber={lease.unit.unit_number}
            propertyId={lease.unit.property.property_id}
            propertyName={lease.unit.property.property_name}
            categories={activeCategories}
            raiseAction={handleRaiseTicket}
          />
        </ExpandableForm>
      )}

      <ResidentTicketList tickets={list} />
    </div>
  );
}
