"use client";

import Link from "next/link";
import SetDefaultPropertyButton from "@/app/admin/properties/SetDefaultPropertyButton";

export interface PropertyData {
  property_id: string;
  property_name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  total_units: number;
  is_default?: boolean;
  _count: {
    units: number;
    facilities?: number;
    tickets?: number;
    announcements?: number;
  };
  units?: { status: string }[];
}

interface PropertyCardProps {
  property: PropertyData;
  isActiveDefault: boolean;
  onEdit: (property: PropertyData) => void;
  onDelete: (property: PropertyData) => void;
}

export default function PropertyCard({
  property,
  isActiveDefault,
  onEdit,
  onDelete,
}: PropertyCardProps) {
  const totalUnits = property._count?.units ?? 0;
  const occupiedUnits = property.units ? property.units.filter((u) => u.status === "Occupied").length : 0;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const facilityCount = property._count?.facilities ?? 0;

  const typeIcon =
    property.property_type?.toLowerCase().includes("condo")
      ? "apartment"
      : property.property_type?.toLowerCase().includes("serviced")
      ? "domain"
      : property.property_type?.toLowerCase().includes("gated") || property.property_type?.toLowerCase().includes("town")
      ? "holiday_village"
      : "home_work";

  return (
    <div
      className={`min-w-0 rounded-2xl p-5 bg-surface-container border transition-all duration-200 flex flex-col justify-between gap-4 group ${
        isActiveDefault
          ? "border-amber-500/40 bg-surface-container shadow-[0_0_25px_rgba(245,158,11,0.08)]"
          : "border-outline-variant/60 hover:border-outline-variant hover:bg-surface-container-high/40"
      }`}
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">{typeIcon}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                {property.property_name}
              </h3>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-on-surface-variant">
                <span className="shrink-0 rounded-md border border-outline-variant/40 bg-surface-container-high px-2 py-0.5">
                  {property.property_type}
                </span>
                {/* truncate, not wrap — a long city name used to stack into a
                    narrow column and shove the title around on a phone. */}
                <span className="truncate whitespace-nowrap">
                  {property.city}, {property.state}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <SetDefaultPropertyButton
              propertyId={property.property_id}
              isDefault={isActiveDefault}
            />
          </div>
        </div>

        {/* Address Row */}
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/80 border-b border-outline-variant/30 pb-3 pt-1">
          <span className="material-symbols-outlined text-[15px] text-on-surface-variant shrink-0">location_on</span>
          <span className="truncate">{property.address}, {property.postal_code}</span>
        </div>
      </div>

      {/* Metrics Row (Units / Occupancy / Facilities) */}
      <div className="grid grid-cols-3 gap-2 py-1">
        {/* Total Units */}
        <div className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 flex flex-col items-center text-center">
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">meeting_room</span>
            Units
          </span>
          <span className="text-sm font-bold text-white">{totalUnits}</span>
          <span className="text-[10px] text-on-surface-variant/70">on record</span>
        </div>

        {/* Occupancy Rate */}
        <div className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 flex flex-col items-center text-center">
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">pie_chart</span>
            Occupancy
          </span>
          <span className="text-sm font-bold text-white">{occupancyRate}%</span>
          <span className="text-[10px] text-emerald-400/80">{occupiedUnits} leased</span>
        </div>

        {/* Facilities */}
        <div className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 flex flex-col items-center text-center">
          <span className="mb-0.5 flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">pool</span>
            Facilities
          </span>
          <span className="text-sm font-bold text-white">{facilityCount}</span>
          <span className="text-[10px] text-on-surface-variant/70">
            {facilityCount === 1 ? "bookable" : "bookable"}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/30 pt-2">
        {/* View Units Primary Action */}
        <Link
          href={`/admin/units?property=${property.property_id}`}
          className="pressable flex flex-1 basis-28 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90"
        >
          View units
        </Link>

        {/* Edit Button */}
        <button
          type="button"
          onClick={() => onEdit(property)}
          className="pressable flex items-center justify-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
        >
          <span className="material-symbols-outlined text-[15px]">edit</span>
          Edit
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onDelete(property)}
          className="pressable flex items-center justify-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/25"
        >
          <span className="material-symbols-outlined text-[15px]">delete</span>
          Delete
        </button>
      </div>
    </div>
  );
}
