import { requireUser } from "@/lib/auth";
import { getReportsData, DateRangeKey } from "@/lib/reports";
import AdminReportsClient from "./AdminReportsClient";
import { getActivePropertyId } from "@/lib/property-context.server";

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
  /*
   * The report opened on "All properties (aggregated)" while the top bar named
   * one, so the header said Testing over figures covering all four - 22 units
   * and arrears for units that are not in Testing at all. It follows the top
   * bar now; aggregating across the portfolio is still one click, but it is a
   * choice rather than a silent default that contradicts the header.
   */
  const propertyId = resolvedParams.propertyId
    ? resolvedParams.propertyId
    : (await getActivePropertyId()) ?? "ALL";
  const dateRange = (resolvedParams.dateRange || "ytd") as DateRangeKey;

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
