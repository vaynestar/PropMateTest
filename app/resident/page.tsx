import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import {
  getResidentPortalData,
  getLatestAnnouncement,
  getResidentBookings,
} from "@/lib/resident";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return "RM " + value.toFixed(2);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const QUICK_ACTIONS = [
  { label: "Invoices", icon: "receipt_long", href: "/resident/invoices" },
  { label: "Helpdesk", icon: "build_circle", href: "/resident/maintenance" },
  { label: "Facilities", icon: "pool", href: "/resident/facilities" },
  { label: "Visitors", icon: "person_search", href: "/resident/visitors" },
  { label: "Notices", icon: "campaign", href: "/resident/announcements" },
  { label: "My Unit", icon: "apartment", href: "/resident/unit" },
];

export default async function ResidentDashboardPage() {
  const user = await getSessionUser();
  const { lease } = await getResidentPortalData(user!.userId);
  const bookings = await getResidentBookings(user!.userId);

  if (!lease) {
    return (
      <div className="flex flex-col gap-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Welcome Home
        </h1>
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-5xl">
            info
          </span>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
            No active tenancy is linked to your account yet. Please contact your
            property manager for assistance.
          </p>
        </div>
      </div>
    );
  }

  const announcement = await getLatestAnnouncement(
    lease.unit.property.property_id
  );

  const outstanding = lease.invoices
    .filter((i) => i.status !== "Paid")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);
  const nextDue = lease.invoices
    .filter((i) => i.status !== "Paid")
    .sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0];
  const dueInDays = nextDue
    ? Math.round(
        (new Date(nextDue.due_date).setHours(0, 0, 0, 0) -
          new Date().setHours(0, 0, 0, 0)) /
          86400000
      )
    : null;

  return (
    <div className="flex flex-col gap-stack-lg min-w-0 w-full max-w-full">
      <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
        Welcome Home
      </h1>

      <section className="glass-card rounded-xl p-stack-lg flex flex-col gap-stack-md relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        <div className="flex justify-between items-start z-10">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Current Balance
            </span>
            <span className="font-display-lg text-display-lg text-on-surface mt-1">
              {formatCurrency(outstanding)}
            </span>
          </div>
          {dueInDays !== null && dueInDays >= 0 && (
            <div className="bg-error/10 border border-error/30 px-2 py-1 rounded text-error font-label-sm text-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                error
              </span>
              Due in {dueInDays} day{dueInDays === 1 ? "" : "s"}
            </div>
          )}
        </div>
        <div className="flex gap-stack-sm mt-4 z-10 w-full">
          <Link
            href="/resident/invoices"
            className="btn-primary flex-1 py-3 rounded-lg font-label-md text-label-md flex justify-center items-center gap-2"
          >
            Pay Now
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
          <Link
            href="/resident/invoices"
            className="bg-transparent border border-outline px-6 py-3 rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center"
          >
            History
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-3 sm:grid-cols-6 gap-stack-sm">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="pressable glass-card rounded-xl p-stack-md flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors group"
          >
            <div className="w-11 h-11 rounded-full bg-surface-container-high/50 flex items-center justify-center border border-outline-variant group-hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-on-surface transition-colors text-[20px]">
                {action.icon}
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface text-center truncate w-full">
              {action.label}
            </span>
          </Link>
        ))}
      </section>

      {bookings.length > 0 && (
        <section className="flex flex-col gap-stack-sm min-w-0 w-full max-w-full">
          <div className="flex justify-between items-center">
            <h2 className="font-title-lg text-title-lg text-on-surface">Upcoming Bookings</h2>
            <Link href="/resident/facilities" className="font-label-sm text-label-sm text-primary hover:text-primary-container">View All</Link>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-stack-md pb-4 -mx-margin-mobile px-margin-mobile">
            {bookings.map((booking) => {
              const d = new Date(booking.booking_date);
              const today = new Date();
              today.setHours(0,0,0,0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);

              let dateDisplay = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              if (d.getTime() === today.getTime()) dateDisplay = "Today";
              else if (d.getTime() === tomorrow.getTime()) dateDisplay = "Tomorrow";

              const startStr = new Date(booking.start_time).toTimeString().slice(0, 5);
              const endStr = new Date(booking.end_time).toTimeString().slice(0, 5);

              return (
                <div
                  key={booking.booking_id}
                  className="glass-card rounded-xl p-stack-md flex flex-col gap-stack-sm flex-shrink-0 w-64 border-l-4 border-l-primary"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-label-sm text-label-sm text-primary font-bold">{dateDisplay}</span>
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                      {booking.booking_status}
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-label-md text-on-surface">{booking.facility.facility_name}</span>
                    <div className="flex items-center gap-2 text-on-secondary">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span className="font-label-sm text-label-sm">
                        {startStr} - {endStr}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {announcement && (
        <section className="flex flex-col gap-stack-sm mb-4">
          <div className="flex justify-between items-center">
            <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
              <span>Latest Announcement</span>
            </h2>
            <Link
              href="/resident/announcements"
              className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-0.5"
            >
              <span>View All Circulars</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          <Link
            href="/resident/announcements"
            className={`glass-card rounded-2xl p-4 sm:p-5 flex items-start gap-4 hover:border-primary/50 transition-all ${
              announcement.priority === "Urgent"
                ? "border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                : "hover:bg-surface-container-high"
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                announcement.priority === "Urgent"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {announcement.priority === "Urgent" ? "warning" : "campaign"}
              </span>
            </div>

            <div className="flex flex-col gap-1 w-full min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {announcement.priority === "Urgent" && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider">
                      🚨 Urgent
                    </span>
                  )}
                  {announcement.is_pinned && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">push_pin</span>
                      Pinned
                    </span>
                  )}
                  <h3 className="font-bold text-white text-base truncate">
                    {announcement.title}
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                  {formatDate(announcement.publish_date)}
                </span>
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 mt-0.5">
                {announcement.content}
              </p>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
