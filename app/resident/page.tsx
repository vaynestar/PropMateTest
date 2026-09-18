import Link from "next/link";
import { getFacilityAccentColor } from "@/lib/facility-colors";
import { shortDate } from "@/lib/short-date";
import { getSessionUser } from "@/lib/auth";
import {
  getResidentPortalData,
  getLatestAnnouncement,
  getResidentBookings,
  getResidentOutstanding,
} from "@/lib/resident";

export const dynamic = "force-dynamic";

/** "RM 29,850.00" - the old toFixed() gave "RM 29850.00", hard to read at a glance. */
function formatCurrency(value: number) {
  return "RM " + value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Booking times in Malaysia time - toTimeString() used the server's zone (UTC on Vercel). */
function myTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kuala_Lumpur",
  });
}

/** YYYY-MM-DD of a moment in Malaysia time. */
function myDateISO(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(d);
}

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kuala_Lumpur" }).format(new Date())
  );
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
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

  const outstanding = await getResidentOutstanding(user!.userId);
  const firstName = (user?.user_name || "there").trim().split(/\s+/)[0];
  const dueInDays = outstanding.nextDue
    ? Math.round(
        (new Date(outstanding.nextDue).setHours(0, 0, 0, 0) -
          new Date().setHours(0, 0, 0, 0)) /
          86400000
      )
    : null;

  return (
    <div className="flex flex-col gap-stack-lg min-w-0 w-full max-w-full">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface leading-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
          Unit {lease.unit.unit_number} · {lease.unit.property.property_name}
        </p>
      </section>

      <section
        className={`rounded-2xl p-stack-lg flex flex-col gap-stack-md relative overflow-hidden border ${
          outstanding.overdueCount > 0
            ? "border-rose-500/40 bg-gradient-to-br from-rose-950/60 via-surface-container to-surface-container"
            : "border-primary/30 bg-gradient-to-br from-primary/20 via-surface-container to-surface-container"
        }`}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/15 rounded-full blur-3xl" />
        {/* Label + status on one row, the amount on its own line, so a big
            figure never wraps beside the chip on a phone (DEV-184). */}
        <div className="flex flex-col z-10 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {/* "Outstanding", not "Current Balance" (user): a balance reads like
                money held in an account. This is what is still owed. */}
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              Outstanding
            </span>
            {/* Overdue first: the old chip only ever showed "Due in N days", so a
                resident with nothing but overdue bills saw no warning at all. */}
            {outstanding.overdueCount > 0 ? (
              <span className="bg-error/10 border border-error/30 px-2 py-1 rounded-full text-error text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {outstanding.overdueCount} overdue
              </span>
            ) : (
              dueInDays !== null && (
                <span className="bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full text-amber-300 text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {dueInDays === 0 ? "Due today" : `Due in ${dueInDays} day${dueInDays === 1 ? "" : "s"}`}
                </span>
              )
            )}
          </div>
          <span className="text-[2.25rem] sm:text-5xl leading-tight font-bold text-on-surface mt-2 tabular-nums tracking-tight whitespace-nowrap">
            {formatCurrency(outstanding.total)}
          </span>
          <span className="mt-1 text-sm text-on-surface/80">
            {outstanding.invoiceCount === 0
              ? "Nothing to pay right now"
              : `${outstanding.invoiceCount} unpaid invoice${outstanding.invoiceCount === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex gap-stack-sm mt-4 z-10 w-full">
          <Link
            href="/resident/invoices"
            className="btn-primary flex-1 py-3 rounded-lg font-label-md text-label-md flex justify-center items-center gap-2"
          >
            {outstanding.invoiceCount > 0 ? "View & Pay" : "View invoices"}
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
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/25 group-hover:bg-primary/25 transition-colors">
              <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
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
            <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">event_available</span>
              <span>Upcoming Bookings</span>
            </h2>
            <Link
              href="/resident/facilities"
              className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-stack-md pb-4 -mx-margin-mobile px-margin-mobile">
            {bookings.map((booking) => {
              // Compared as Malaysia dates - the server runs in UTC.
              const iso = new Date(booking.booking_date).toISOString().slice(0, 10);
              const todayIso = myDateISO(new Date());
              const tomorrowIso = myDateISO(new Date(Date.now() + 86400000));
              const dateDisplay =
                iso === todayIso ? "Today" : iso === tomorrowIso ? "Tomorrow" : shortDate(iso);
              const accent = getFacilityAccentColor(booking.facility.facility_type);
              const photo = booking.facility.image_url;

              return (
                <Link
                  href="/resident/facilities"
                  key={booking.booking_id}
                  className="relative isolate flex flex-col justify-end flex-shrink-0 w-72 h-40 rounded-2xl overflow-hidden border border-outline-variant/60 bg-surface-container hover:border-primary/60 transition-colors pressable"
                >
                  {/*
                    Poster-style card (user, 2026-09-18, GSC app as reference): the
                    facility photo fills the card behind a dark fade and the booking
                    details sit on top in white. DEV-185 put an <img> on the right
                    half; on iPhone it painted over the text. Now the photo is a CSS
                    background on its own layer (z-0), the fade is z-10 and the text
                    z-20, so nothing can reorder them.
                  */}
                  {photo && (
                    <div
                      aria-hidden
                      className="absolute inset-0 z-0 bg-cover bg-center scale-105"
                      style={{ backgroundImage: `url("${photo}")` }}
                    />
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
                  />

                  <div className="relative z-20 p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-black/45 border border-white/20 text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {accent.icon}
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-fixed-dim drop-shadow">{dateDisplay}</p>
                        <p className="text-base font-bold text-white truncate max-w-[11rem] drop-shadow">{booking.facility.facility_name}</p>
                      </div>
                    </div>

                    {/* Time in its own colour so it reads as the time at a glance */}
                    <span className="self-start inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-sky-500/30 border border-sky-300/60 text-sky-100 text-sm font-bold tabular-nums backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {myTime(booking.start_time)} – {myTime(booking.end_time)}
                    </span>
                  </div>
                </Link>
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
              <span>View All</span>
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
