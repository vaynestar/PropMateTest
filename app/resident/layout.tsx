import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import ResidentLayout from "@/components/layout/ResidentLayout";

export default async function ResidentLayoutRoute({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser(["Resident"]);
  return <ResidentLayout>{children}</ResidentLayout>;
}
