import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import {
  getResidentPortalData,
  getLatestAnnouncement,
} from "@/lib/resident";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(value);
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
  { label: "Visitors", icon: "group_add", href: "#" },
];

export default async function ResidentDashboardPage() {
  const user = await getSessionUser();
  const { lease } = await getResidentPortalData(user!.userId);

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
    <div className="flex flex-col gap-stack-lg">
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
        <div className="flex gap-stack-sm mt-2 z-10">
          <Link
            href="/resident/invoices"
            className="gradient-btn flex-1 py-3 font-label-md text-label-md flex justify-center items-center gap-2"
          >
            Pay Now
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
          <Link
            href="/resident/invoices"
            className="bg-transparent border border-outline px-4 rounded font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
          >
            History
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-stack-sm">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="pressable glass-card rounded-lg p-stack-md flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant group-hover:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface transition-colors">
                {action.icon}
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface">
              {action.label}
            </span>
          </Link>
        ))}
      </section>

      {announcement && (
        <section className="flex flex-col gap-stack-sm mb-4">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            Latest Announcement
          </h2>
          <div className="glass-card rounded-lg p-stack-md flex items-start gap-stack-md">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                campaign
              </span>
            </div>
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center">
                <span className="font-label-md text-label-md text-on-surface">
                  {announcement.title}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {formatDate(announcement.publish_date)}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">
                {announcement.content}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
