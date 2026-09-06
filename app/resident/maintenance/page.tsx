import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData, getResidentTickets } from "@/lib/resident";
import { listTicketCategories, raiseTicket } from "@/lib/maintenance";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ExpandableForm from "@/components/layout/ExpandableForm";
import ResidentRaiseTicketForm from "@/components/maintenance/ResidentRaiseTicketForm";

export const dynamic = "force-dynamic";

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
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

    try {
      await raiseTicket({
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
      revalidatePath("/resident/maintenance");
      return { success: true };
    } catch (err: any) {
      return { error: err?.message || "Failed to raise ticket." };
    }
  }

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Helpdesk Support
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Report maintenance issues for your unit or building common areas (hallways, lifts, amenities).
        </p>
      </div>

      {lease && (
        <ExpandableForm title="Raise a Helpdesk Request" buttonLabel="New Request" defaultOpen={false}>
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

      <div className="flex flex-col gap-stack-sm w-full">
        <h2 className="font-title-lg text-title-lg text-on-surface px-1">
          My Submitted Requests ({tickets.length})
        </h2>
        <div className="flex flex-col gap-stack-md w-full">
          {tickets.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8 text-center glass-card rounded-xl">
              No helpdesk requests reported yet.
            </p>
          )}
          {tickets.map((t) => {
            const isCommonArea = t.location_type === "Common Area";
            const unitNumber = t.unit?.unit_number || t.lease?.unit?.unit_number;

            return (
              <div
                key={t.ticket_id}
                className="glass-card rounded-xl p-5 flex flex-col gap-3 w-full border border-outline-variant/30 hover:border-primary/40 transition-colors shadow-sm"
              >
                <div className="flex justify-between items-start w-full gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold">
                        #{t.ticket_id.split("-")[0].toUpperCase()}
                      </span>
                      <span className="font-label-md text-xs text-primary font-semibold">
                        {t.ticket_category}
                      </span>
                    </div>
                    <span className="font-title-lg text-title-lg text-on-surface font-semibold">
                      {t.title}
                    </span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                {t.description && (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t.description}
                  </p>
                )}

                {t.remark && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-300 shrink-0">
                      info
                    </span>
                    <div>
                      <span className="font-semibold block text-amber-300">Management Remark:</span>
                      <span>{t.remark}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center w-full mt-1 pt-3 border-t border-outline-variant/20 text-xs">
                  <span className="text-on-surface-variant font-mono">
                    Reported: {formatDate(t.created_at)}
                  </span>
                  {isCommonArea ? (
                    <span className="text-cyan-300 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">domain</span>
                      <span>{t.location_detail || "Common Area"}</span>
                    </span>
                  ) : (
                    <span className="text-primary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">meeting_room</span>
                      <span>Unit {unitNumber || "N/A"}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
