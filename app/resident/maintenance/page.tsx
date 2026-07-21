import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData, getResidentTickets } from "@/lib/resident";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ExpandableForm from "@/components/layout/ExpandableForm";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Maintenance", "Plumbing", "Electrical", "Security", "Others"];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

async function raiseTicket(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unit_id: String(formData.get("unit_id")),
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      ticket_category: String(formData.get("ticket_category")),
      priority: "Medium",
    }),
  });
  revalidatePath("/resident/maintenance");
}

export default async function ResidentMaintenancePage() {
  const user = await getSessionUser();
  const [{ lease }, tickets] = await Promise.all([
    getResidentPortalData(user!.userId),
    getResidentTickets(user!.userId),
  ]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Helpdesk
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Report issues and track your requests.
        </p>
      </div>

      {lease && (
        <ExpandableForm title="Raise a Request" buttonLabel="New Request">
          <form action={raiseTicket} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="unit_id" value={lease.unit.unit_id} />
            <input
              name="title"
              placeholder="Issue title"
              required
              className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary md:col-span-2"
            />
            <select
              name="ticket_category"
              defaultValue="Maintenance"
              className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <textarea
              name="description"
              placeholder="Describe the issue"
              required
              rows={3}
              className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary md:col-span-2 resize-none"
            />
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all md:col-span-2"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                add_alert
              </span>
              Submit Request
            </button>
          </form>
        </ExpandableForm>
      )}

      <div className="flex flex-col gap-stack-sm w-full">
        <h2 className="font-title-lg text-title-lg text-on-surface px-1">
          My Requests
        </h2>
        <div className="flex flex-col gap-stack-md w-full">
          {tickets.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8 text-center glass-card rounded-xl">
              No helpdesk requests yet.
            </p>
          )}
          {tickets.map((t) => (
            <div
              key={t.ticket_id}
              className="glass-card rounded-xl p-4 flex flex-col gap-3 w-full"
            >
              <div className="flex justify-between items-start w-full">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    {t.ticket_category}
                  </span>
                  <span className="font-title-lg text-title-lg text-on-surface">
                    {t.title}
                  </span>
                </div>
                <StatusBadge status={t.status} variant="ticket" />
              </div>
              {t.description && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t.description}
                </p>
              )}
              <div className="flex justify-between items-center w-full mt-2 pt-3 border-t border-outline-variant/30">
                <span className="font-body-md text-body-md text-on-surface-variant">
                  Reported: {formatDate(t.created_at)}
                </span>
                <span className="font-label-md text-label-md text-primary">
                  Unit {t.lease.unit.unit_number}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
