import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getResidentPortalData, getResidentTickets } from "@/lib/resident";
import StatusBadge from "@/components/dashboard/StatusBadge";

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
          Maintenance
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Report issues and track your requests.
        </p>
      </div>

      {lease && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-title-lg text-title-lg text-on-surface mb-4">
            Raise a Request
          </h2>
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
        </div>
      )}

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            My Requests
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/30">
          {tickets.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8">
              No maintenance requests yet.
            </p>
          )}
          {tickets.map((t) => (
            <div
              key={t.ticket_id}
              className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-6 py-4"
            >
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-title-md text-title-md text-on-surface">
                    {t.title}
                  </span>
                  <StatusBadge status={t.status} variant="ticket" />
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                  {t.ticket_category} · {t.lease.unit.unit_number} · Reported{" "}
                  {formatDate(t.created_at)}
                </p>
                {t.description && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    {t.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
