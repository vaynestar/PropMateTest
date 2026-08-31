import { requireUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import AdminSettingsClient from "./AdminSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireUser(["Admin"]);
  const settings = await getSystemSettings();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <AdminSettingsClient settings={settings} />
    </div>
  );
}
