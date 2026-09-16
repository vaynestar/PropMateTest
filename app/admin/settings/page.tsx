import { requireUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import AdminSettingsClient from "./AdminSettingsClient";
import { firebaseStorageConfigured } from "@/lib/storage/firebase";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireUser(["Admin"]);
  const settings = await getSystemSettings();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <AdminSettingsClient
        settings={settings}
        storageStatus={{
          configured: firebaseStorageConfigured(),
          bucket: process.env.FIREBASE_STORAGE_BUCKET ?? null,
        }}
      />
    </div>
  );
}
