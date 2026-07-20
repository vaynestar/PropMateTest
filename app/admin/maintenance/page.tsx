import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listTickets } from "@/lib/maintenance";
import { listUnits } from "@/lib/unit-management";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ExpandableForm from "@/components/layout/ExpandableForm";

export const dynamic = "force-dynamic";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES = ["Maintenance", "Plumbing", "Electrical", "Security", "Others"];
const NEXT_STATUSES: Record<string, string> = {
  Open: "In Progress",
  "In Progress": "Resolved",
  Resolved: "Closed",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

async function raiseTicket(formData: FormData) {
  "use server";
  const user = await requireUser(["Admin"]);
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unit_id: String(formData.get("unit_id")),
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      ticket_category: String(formData.get("ticket_category")),
      priority: String(formData.get("priority")),
    }),
  });
  revalidatePath("/admin/maintenance");
}

async function updateStatus(formData: FormData) {
  "use server";
  await requireUser(["Admin"]);
  const ticketId = String(formData.get("ticket_id"));
  const status = String(formData.get("status"));
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/tickets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket_id: ticketId, status }),
  });
  revalidatePath("/admin/maintenance");
}

export default async function MaintenancePage() {
  const user = await requireUser(["Admin"]);
  const [tickets, units] = await Promise.all([listTickets(), listUnits()]);

  const occupiedUnits = units.filter((u) => u.status === "Occupied");
  const openCount = tickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Helpdesk
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Raise and track maintenance tickets across your properties.
          </p>
        </div>
        <span className="glass-card rounded-xl px-5 py-3">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Open tickets
          </span>
          <span className="font-headline-md text-headline-md text-on-surface ml-2">
            {openCount}
          </span>
        </span>
      </div>

      <ExpandableForm title="Raise New Ticket" buttonLabel="New Ticket">
        <form action={raiseTicket} className="grid gap-4 md:grid-cols-2">
          <select
            name="unit_id"
            required
            defaultValue=""
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            <option value="">Select occupied unit</option>
            {occupiedUnits.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                {u.unit_number} · {u.property.property_name}
              </option>
            ))}
          </select>

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

          <input
            name="title"
            placeholder="Issue title (e.g., AC not cooling)"
            required
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary md:col-span-2"
          />

          <textarea
            name="description"
            placeholder="Describe the issue"
            required
            rows={3}
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary md:col-span-2 resize-none"
          />

          <select
            name="priority"
            defaultValue="Medium"
            className="rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              add_alert
            </span>
            Raise Ticket
          </button>
        </form>
      </ExpandableForm>

      <div className="glass-card rounded-xl p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            All Tickets
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/30">
          {tickets.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant px-6 py-8">
              No helpdesk tickets yet.
            </p>
          )}
          {tickets.map((t) => {
            const next = NEXT_STATUSES[t.status];
            return (
              <div
                key={t.ticket_id}
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-6 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-title-md text-title-md text-on-surface">
                      {t.title}
                    </span>
                    <StatusBadge status={t.status} variant="ticket" />
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                    {t.lease.unit.unit_number} ·{" "}
                    {t.lease.unit.property.property_name} · {t.priority}{" "}
                    priority
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Reported {formatDate(t.created_at)}
                  </p>
                </div>

                {next ? (
                  <form action={updateStatus} className="shrink-0">
                    <input
                      type="hidden"
                      name="ticket_id"
                      value={t.ticket_id}
                    />
                    <input type="hidden" name="status" value={next} />
                    <button
                      type="submit"
                      className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors"
                    >
                      Mark {next}
                    </button>
                  </form>
                ) : (
                  <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                    Closed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
