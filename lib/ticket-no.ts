import "server-only";
import prisma from "@/lib/prisma";

/**
 * The next ticket number (DEV-256).
 *
 * Sequential per database rather than per property, because a contractor who
 * works three buildings should never be handed the same number twice. The
 * highest existing number is read and incremented; `tickets_ticket_no_key` is
 * unique, so two simultaneous raises collide loudly rather than silently
 * sharing a number — at this scale that is a better trade than a sequence
 * table, and a retry costs one query.
 */
export async function nextTicketNo(): Promise<string> {
  const latest = await prisma.ticket.findFirst({
    where: { ticket_no: { startsWith: "PM-" } },
    orderBy: { ticket_no: "desc" },
    select: { ticket_no: true },
  });
  const n = latest?.ticket_no ? Number(latest.ticket_no.slice(3)) : 0;
  return `PM-${String((Number.isFinite(n) ? n : 0) + 1).padStart(4, "0")}`;
}
