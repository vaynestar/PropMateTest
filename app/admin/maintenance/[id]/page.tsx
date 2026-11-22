import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTicketThread } from "@/lib/ticket-thread";
import { getOperationalSettings } from "@/lib/settings";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { isOpenStatus, ticketRef, ticketStateLabel } from "@/lib/ticket-states";
import TicketWorkRail from "@/components/maintenance/TicketWorkRail";
import TicketThreadView from "@/components/maintenance/TicketThreadView";

export const dynamic = "force-dynamic";

/**
 * One ticket, on its own page (DEV-266) — to the batch-3 `TicketThread`
 * artboard.
 *
 * It was a modal over the queue. A conversation that runs for 88 days, three
 * fields of work to record and an SLA clock do not belong in a dialog that
 * dims the thing behind it, and a modal has no address: nothing could link
 * to a ticket.
 */
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["Admin"]);
  const { id } = await params;

  const [thread, ticket, admins, ops] = await Promise.all([
    getTicketThread(id, user),
    prisma.ticket.findUnique({
      where: { ticket_id: id },
      select: {
        ticket_id: true,
        ticket_no: true,
        title: true,
        priority: true,
        status: true,
        cost: true,
        assigned_to: true,
        created_at: true,
        unit_id: true,
        unit: { select: { unit_id: true, unit_number: true } },
        lease: { select: { tenant: { select: { user_name: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: "Admin", is_active: true },
      select: { user_id: true, user_name: true },
      orderBy: { user_name: "asc" },
    }),
    getOperationalSettings(),
  ]);

  if (!thread || !ticket) notFound();

  const slaHours = ops.sla[ticket.priority] ?? ops.sla.Medium;
  const hoursOpen = (Date.now() - new Date(ticket.created_at).getTime()) / 3_600_000;
  const open = isOpenStatus(ticket.status);
  const pastBy = Math.floor((hoursOpen - slaHours) / 24);
  const breached = open && hoursOpen > slaHours;
  const daysOpen = Math.floor(hoursOpen / 24);

  /*
   * "The lift's own history" — three tickets on the same lift and a service
   * that is overdue is one story, and only this page can tell it. For a unit
   * ticket the equivalent is the unit's own record.
   */
  const siblings = ticket.unit_id
    ? await prisma.ticket.count({
        where: { unit_id: ticket.unit_id, ticket_id: { not: ticket.ticket_id } },
      })
    : 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <Link
        href="/admin/maintenance"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Helpdesk
      </Link>

      <div>
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-on-surface-variant">{ticketRef(ticket)}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              ticket.priority === "Urgent" || ticket.priority === "High"
                ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                : "border-outline-variant/60 bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {ticket.priority}
          </span>
          {breached && (
            <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
              {pastBy} day{pastBy === 1 ? "" : "s"} past SLA
            </span>
          )}
        </span>
        <PageHeader
          title={ticket.title}
          subtitle={`${thread.where} · ${thread.category} · reported by ${
            thread.reporter ?? "the office"
          } on ${thread.reported}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TicketThreadView
            ticketId={ticket.ticket_id}
            messages={thread.messages}
            description={thread.description}
            residentName={ticket.lease?.tenant?.user_name ?? thread.reporter ?? "The resident"}
          />
        </div>

        <div className="min-w-0 space-y-5">
          <TicketWorkRail
            ticketId={ticket.ticket_id}
            assignedTo={ticket.assigned_to}
            status={ticket.status}
            cost={ticket.cost === null || ticket.cost === undefined ? null : Number(ticket.cost)}
            admins={admins}
            daysUnowned={ticket.assigned_to ? 0 : daysOpen}
          />

          <SectionCard title="The clock">
            <dl className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Reported</dt>
                <dd className="font-bold tabular-nums text-on-surface">{thread.reported}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">{open ? "Open for" : "Was open for"}</dt>
                <dd className={`font-bold tabular-nums ${breached ? "text-rose-300" : "text-on-surface"}`}>
                  {daysOpen} day{daysOpen === 1 ? "" : "s"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Target for {ticket.priority}</dt>
                <dd className="font-bold tabular-nums text-on-surface">
                  {slaHours} hour{slaHours === 1 ? "" : "s"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">{breached ? "Past target by" : "State"}</dt>
                <dd className={`font-bold tabular-nums ${breached ? "text-rose-300" : "text-emerald-300"}`}>
                  {breached
                    ? `${pastBy} day${pastBy === 1 ? "" : "s"}`
                    : open
                    ? "within target"
                    : ticketStateLabel(ticket.status)}
                </dd>
              </div>
            </dl>
          </SectionCard>

          {ticket.unit && (
            <SectionCard title="The unit's own history">
              <p className="text-xs leading-relaxed text-on-surface-variant">
                {siblings === 0
                  ? `This is the only ticket ever raised on ${ticket.unit.unit_number}.`
                  : `${siblings} other ticket${siblings === 1 ? " has" : "s have"} been raised on ${
                      ticket.unit.unit_number
                    }. Repeated faults on one unit are one story, not several.`}
              </p>
              <Link
                href={`/admin/units/${ticket.unit.unit_id}`}
                className="pressable mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-outline-variant/60 bg-surface-container-high text-xs font-semibold text-on-surface transition-colors hover:text-white"
              >
                Open the unit file
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
