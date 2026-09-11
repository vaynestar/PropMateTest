import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import ResidentLayout from "@/components/layout/ResidentLayout";
import { getResidentNotifications } from "@/lib/notifications";

export default async function ResidentLayoutRoute({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser(["Resident"]);
  const notifications = await getResidentNotifications();
  return <ResidentLayout notifications={notifications}>{children}</ResidentLayout>;
}
