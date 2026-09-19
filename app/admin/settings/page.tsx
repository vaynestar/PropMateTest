import { requireUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import AdminSettingsClient from "./AdminSettingsClient";
import { firebaseStorageConfigured } from "@/lib/storage/firebase";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireUser(["Admin"]);
  const [settings, latest] = await Promise.all([
    getSystemSettings(),
    prisma.invoice.findFirst({
      where: { issued_at: { not: null } },
      orderBy: { invoice_date: "desc" },
      select: { invoice_id: true, invoice_no: true },
    }),
  ]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <AdminSettingsClient
        settings={settings}
        sampleInvoice={latest ? { id: latest.invoice_id, no: latest.invoice_no } : null}
        storageStatus={{
          configured: firebaseStorageConfigured(),
          bucket: process.env.FIREBASE_STORAGE_BUCKET ?? null,
        }}
      />
    </div>
  );
}
