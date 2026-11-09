import { requireUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import AdminSettingsClient from "./AdminSettingsClient";
import { firebaseStorageConfigured } from "@/lib/storage/firebase";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const me = await requireUser(["Admin"]);
  const [settings, latest, admins] = await Promise.all([
    getSystemSettings(),
    prisma.invoice.findFirst({
      where: { issued_at: { not: null } },
      orderBy: { invoice_date: "desc" },
      select: { invoice_id: true, invoice_no: true },
    }),
    prisma.user.findMany({
      where: { role: "Admin" },
      select: {
        user_id: true,
        user_name: true,
        user_email: true,
        phone_number: true,
        is_active: true,
      },
      orderBy: [{ is_active: "desc" }, { user_name: "asc" }],
    }),
  ]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <AdminSettingsClient
        settings={settings}
        admins={admins}
        currentUserId={me.userId}
        sampleInvoice={latest ? { id: latest.invoice_id, no: latest.invoice_no } : null}
        storageStatus={{
          configured: firebaseStorageConfigured(),
          bucket: process.env.FIREBASE_STORAGE_BUCKET ?? null,
        }}
      />
    </div>
  );
}
