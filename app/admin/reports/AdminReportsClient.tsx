"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OverviewReportView from "@/components/reports/OverviewReportView";
import FinancialsReportView from "@/components/reports/FinancialsReportView";
import MaintenanceReportView from "@/components/reports/MaintenanceReportView";
import FacilitiesReportView from "@/components/reports/FacilitiesReportView";
import VisitorsReportView from "@/components/reports/VisitorsReportView";

interface AdminReportsClientProps {
  data: any;
  currentPropertyId: string;
  currentDateRange: string;
}

const TABS = [
  { id: "overview", label: "Executive Overview", icon: "dashboard" },
  { id: "financials", label: "Financials & Billing", icon: "payments" },
  { id: "maintenance", label: "Helpdesk & SLA", icon: "build" },
  { id: "facilities", label: "Facility Bookings", icon: "apartment" },
  { id: "visitors", label: "Visitors & Security", icon: "badge" },
];

export default function AdminReportsClient({
  data,
  currentPropertyId,
  currentDateRange,
}: AdminReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (newPropertyId?: string, newDateRange?: string) => {
    const propId = newPropertyId !== undefined ? newPropertyId : currentPropertyId;
    const range = newDateRange !== undefined ? newDateRange : currentDateRange;

    const params = new URLSearchParams(searchParams?.toString() || "");
    if (propId === "ALL") params.delete("propertyId");
    else params.set("propertyId", propId);

    if (range === "30d") params.delete("dateRange");
    else params.set("dateRange", range);

    startTransition(() => {
      router.push(`/admin/reports?${params.toString()}`);
    });
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const timestamp = new Date().toISOString().split("T")[0];
    let filename = `PropMate_Report_${activeTab}_${timestamp}.csv`;

    if (activeTab === "financials") {
      csvContent += "Category,Type,Amount (RM)\n";
      csvContent += `Total Invoiced,Gross Billed,${data.financial.totalInvoiced}\n`;
      csvContent += `Total Collected,Paid Collections,${data.financial.totalCollected}\n`;
      csvContent += `Total Overdue,Outstanding Past Due,${data.financial.totalOverdue}\n`;
      csvContent += `Aging 0-30 Days,Current Overdue,${data.financial.agingReceivables.current}\n`;
      csvContent += `Aging 31-60 Days,Mid Overdue,${data.financial.agingReceivables.days30}\n`;
      csvContent += `Aging 61-90 Days,Late Overdue,${data.financial.agingReceivables.days60}\n`;
      csvContent += `Aging 90+ Days,Severe Arrears,${data.financial.agingReceivables.days90Plus}\n\n`;

      csvContent += "Top Outstanding Defaulters\nUnit,Resident,Property,Overdue Amount (RM),Max Days Overdue\n";
      data.financial.topDefaulters?.forEach((d: any) => {
        csvContent += `"${d.unitNumber}","${d.tenantName}","${d.propertyName}",${d.overdueAmount},${d.maxDaysOverdue}\n`;
      });
    } else if (activeTab === "maintenance") {
      csvContent += "Category,Total Logged,Resolved\n";
      data.maintenance.categoryBreakdown?.forEach((c: any) => {
        csvContent += `"${c.name}",${c.total},${c.resolved}\n`;
      });
    } else if (activeTab === "facilities") {
      csvContent += "Amenity Name,Total Bookings,Cumulative Hours\n";
      data.facilities.amenityUsage?.forEach((f: any) => {
        csvContent += `"${f.name}",${f.count},${f.hours}\n`;
      });
    } else if (activeTab === "visitors") {
      csvContent += "Visitor Type,Total Passes\n";
      data.visitors.typeDistribution?.forEach((t: any) => {
        csvContent += `"${t.type}",${t.count}\n`;
      });
      csvContent += "\nCurrently Inside Active Visitors\nVisitor Name,Type,IC,Vehicle Plate,Destination\n";
      data.visitors.activeVisitorsList?.forEach((v: any) => {
        csvContent += `"${v.visitor_name}","${v.visitor_type}","${v.visitor_ic_no || ""}","${v.vehicle_plate || ""}","${v.destination || ""}"\n`;
      });
    } else {
      // Overview
      csvContent += "Metric,Value\n";
      csvContent += `Occupancy Rate,${data.overview.occupancyRate}%\n`;
      csvContent += `Total Units,${data.overview.totalUnitsCount}\n`;
      csvContent += `Occupied Units,${data.overview.occupiedUnitsCount}\n`;
      csvContent += `Vacant Units,${data.overview.vacantUnitsCount}\n`;
      csvContent += `Collection Rate,${data.overview.collectionRate}%\n`;
      csvContent += `Total Billed (RM),${data.overview.totalInvoicedAmount}\n`;
      csvContent += `Total Collected (RM),${data.overview.totalCollectedAmount}\n`;
      csvContent += `Total Overdue (RM),${data.overview.totalOverdueAmount}\n`;
      csvContent += `Maintenance Resolution Rate,${data.overview.resolutionRate}%\n`;
      csvContent += `Average MTTR (Hours),${data.overview.avgResolutionHours}\n`;
      csvContent += `Active Visitors Inside,${data.overview.activeCheckedInCount}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Reports & Operations Analytics
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Operational scorecard, financial reconciliations, and facility utilization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Property Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-on-surface-variant font-medium shrink-0">Property:</span>
          <select
            value={currentPropertyId}
            onChange={(e) => handleFilterChange(e.target.value, undefined)}
            className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer w-full sm:w-56"
          >
            <option value="ALL">All Properties (Aggregated)</option>
            {data.properties?.map((p: any) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Date Range Selector */}
        <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-outline-variant/40 w-full sm:w-auto justify-between sm:justify-start">
          {[
            { id: "30d", label: "Last 30 Days" },
            { id: "quarter", label: "This Quarter" },
            { id: "ytd", label: "YTD (2026)" },
            { id: "all", label: "All Time" },
          ].map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => handleFilterChange(undefined, r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentDateRange === r.id
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revalidation Loading Indicator */}
      {isPending && (
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center justify-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          <span>Aggregating analytics records from database...</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-outline-variant/30 hide-scrollbar">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
              activeTab === t.id
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-white hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Render Active Tab View */}
      <div>
        {activeTab === "overview" && <OverviewReportView data={data} />}
        {activeTab === "financials" && <FinancialsReportView data={data} />}
        {activeTab === "maintenance" && <MaintenanceReportView data={data} />}
        {activeTab === "facilities" && <FacilitiesReportView data={data} />}
        {activeTab === "visitors" && <VisitorsReportView data={data} />}
      </div>
    </div>
  );
}
