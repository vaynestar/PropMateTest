import { requireUser } from "@/lib/auth";
import { getResidentNotificationsFor } from "@/lib/notifications";
import NotificationFeed from "@/components/layout/NotificationFeed";

export const dynamic = "force-dynamic";

/**
 * Every update, with the category filters (DEV-244).
 *
 * The bell is deliberately short — it answers "is there anything I have to
 * do?" and holds two tabs. This is where an update goes to be found again
 * after it has scrolled out of the popover, and where filtering by Bills or
 * Repairs makes sense, because the resident came here on purpose.
 */
export default async function ResidentNotificationsPage() {
  const user = await requireUser(["Resident"]);
  const items = await getResidentNotificationsFor(user.userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <p className="text-sm text-on-surface-variant">
        Everything the office has sent you, newest first.
      </p>
      <NotificationFeed items={items} />
    </div>
  );
}
