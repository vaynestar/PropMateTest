import { requireUser } from "@/lib/auth";
import { getReportsData, DateRangeKey } from "@/lib/reports";
import AdminReportsClient from "./AdminReportsClient";

export const dynamic = "force-dynamic";

interface AdminReportsPageProps {
  searchParams: Promise<{
    propertyId?: string;
    dateRange?: string;
  }>;
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requireUser(["Admin"]);

  const resolvedParams = await searchParams;
  const propertyId = resolvedParams.propertyId || "ALL";
  const dateRange = (resolvedParams.dateRange || "30d") as DateRangeKey;

  const reportData = await getReportsData(propertyId, dateRange);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <AdminReportsClient
        data={reportData}
        currentPropertyId={propertyId}
        currentDateRange={dateRange}
      />
    </div>
  );
}
