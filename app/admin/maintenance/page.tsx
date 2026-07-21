import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { listTickets } from "@/lib/maintenance";
import { listUnits } from "@/lib/unit-management";
import ExpandableForm from "@/components/layout/ExpandableForm";
import AdminTicketTable from "@/components/maintenance/AdminTicketTable";

export const dynamic = "force-dynamic";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES = ["Maintenance", "Plumbing", "Electrical", "Security", "Others"];

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



import prisma from "@/lib/prisma";

export default async function MaintenancePage() {
  await requireUser(["Admin"]);
  const cookieStore = await cookies();
  const propertyId = cookieStore.get("propmate_property_id")?.value;

  const [tickets, units, admins] = await Promise.all([
    listTickets(propertyId),
    listUnits(),
    prisma.user.findMany({ where: { role: "Admin" }, select: { user_id: true, user_name: true } }),
  ]);

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

      <AdminTicketTable tickets={tickets} admins={admins} />
    </div>
  );
}
