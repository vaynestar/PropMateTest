import "server-only";
import prisma from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/ticket-states";
import { todayDateMY } from "@/lib/short-date";

/**
 * Where the work is, for the sidebar (DEV-270).
 *
 * The point of a sidebar is to say where the work is **before** you click.
 * PropMate's listed nine destinations and told you nothing about any of
 * them, so finding the five overdue invoices meant opening Billing, then
 * Invoices, then reading. These are the counts that would have made that
 * trip unnecessary.
 *
 * **Only where there is work.** A badge reading 0 is noise, and nine zeroes
 * is worse than none — every count below is dropped by the renderer when it
 * is zero, so the sidebar stays quiet on a day when nothing needs doing.
 *
 * Scoped to the active property, because every figure on every screen is.
 */
export type NavCounts = {
  vacantUnits: number;
  leasesEnding: number;
  overdueInvoices: number;
  slipsWaiting: number;
  facilitiesOverdue: number;
  /**
   * Bookings on today, not bookings awaiting approval (corrected DEV-268).
   *
   * DEV-270 counted `booking_status: "Pending"` and badged it "N to approve".
   * There is no approval step — it was tried and removed by user decision on
   * 2026-09-06, `createBooking` writes Confirmed, and the census found zero
   * Pending rows in 54 bookings. So the badge could never appear and the
   * term it contributed to "N need you" was permanently zero.
   */
  bookingsToday: number;
  openTickets: number;
  visitorsInside: number;
  /** Open tickets nobody owns — the dashboard says so under the queue. */
  unownedTickets: number;
  /** The two things on the top bar's "N need you". */
  needsYou: number;
};

export async function getNavCounts(propertyId?: string | null): Promise<NavCounts> {
  const inProperty = propertyId ? { property_id: propertyId } : {};
  /*
   * The Malaysian calendar day, not the server's local midnight (DEV-283).
   *
   * `setHours(0,0,0,0)` is midnight where the process runs. Locally that is
   * Malaysia and looks correct; on Vercel it is UTC, which is 08:00 Malaysian
   * time, so for the first eight hours of every working day these counts were
   * drawn against the wrong day. lib/invoice-state.ts records the same fault
   * being fixed on the resident side (R17); this file never got the change.
   */
  const today = todayDateMY();
  const inThirtyDays = new Date(today.getTime() + 30 * 86_400_000);

  const [
    vacantUnits,
    leasesEnding,
    overdueInvoices,
    slipsWaiting,
    facilitiesOverdue,
    bookingsToday,
    openTickets,
    visitorsInside,
    unownedTickets,
  ] = await Promise.all([
    prisma.unit.count({ where: { ...inProperty, status: "Vacant" } }),
    prisma.tenantLease.count({
      where: {
        status: "Active",
        unit: inProperty,
        move_out_date: { gte: today, lte: inThirtyDays },
      },
    }),
    prisma.invoice.count({
      where: {
        status: { notIn: ["Paid", "Inactive"] },
        /*
         * A draft is not overdue. Nobody has been sent it, so nobody is late
         * paying it — `issued_at` is what the invoice list itself tests to
         * draw "Draft, not sent". Without this the sidebar badged a freshly
         * generated run as overdue the moment its due date passed, while the
         * Overdue chip on the page it linked to read 0 (DEV-283).
         */
        issued_at: { not: null },
        due_date: { lt: today },
        ...(propertyId ? { lease: { unit: { property_id: propertyId } } } : {}),
      },
    }),
    prisma.paymentTransaction.count({
      where: {
        transaction_status: "Pending",
        payment_method: "Bank transfer",
        ...(propertyId ? { invoice: { lease: { unit: { property_id: propertyId } } } } : {}),
      },
    }),
    prisma.facility.count({
      where: { ...inProperty, next_maintenance_date: { lt: today } },
    }),
    prisma.booking.count({
      where: {
        booking_status: { not: "Cancelled" },
        booking_date: { gte: today, lt: new Date(today.getTime() + 86_400_000) },
        ...(propertyId ? { facility: { property_id: propertyId } } : {}),
      },
    }),
    prisma.ticket.count({ where: { ...inProperty, status: { in: OPEN_STATUSES } } }),
    prisma.visitor.count({ where: { ...inProperty, status: "Checked In" } }),
    prisma.ticket.count({
      where: { ...inProperty, status: { in: OPEN_STATUSES }, assigned_to: null },
    }),
  ]);

  /*
   * "N need you" is deliberately narrow: a slip somebody is waiting on and
   * a ticket nobody owns. Two things with a person at the other end, each
   * stuck until an admin acts. Overdue invoices are not in it — they are a
   * standing condition, not an item in a queue, and folding them in would
   * make the number permanently large and therefore ignorable.
   *
   * Bookings are not in it either (DEV-268). Nothing waits on the office to
   * approve a booking, so a booking count here would only ever have been
   * decoration; `bookingsToday` is reported for the sidebar, not for this.
   */
  return {
    vacantUnits,
    leasesEnding,
    overdueInvoices,
    slipsWaiting,
    facilitiesOverdue,
    bookingsToday,
    openTickets,
    visitorsInside,
    unownedTickets,
    needsYou: slipsWaiting + unownedTickets,
  };
}
