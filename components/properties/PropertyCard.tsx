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
      className={`rounded-2xl p-5 bg-surface-container border transition-all duration-200 flex flex-col justify-between gap-4 group ${
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
              <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant font-medium">
                <span className="px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/40 text-on-surface-variant">
                  {property.property_type}
                </span>
                <span>•</span>
                <span>{property.city}, {property.state}</span>
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
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1 mb-0.5">
            <span className="material-symbols-outlined text-[13px]">meeting_room</span>
            Units
          </span>
          <span className="text-sm font-bold text-white">{totalUnits}</span>
          <span className="text-[10px] text-on-surface-variant/70">Registered</span>
        </div>

        {/* Occupancy Rate */}
        <div className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 flex flex-col items-center text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1 mb-0.5">
            <span className="material-symbols-outlined text-[13px]">pie_chart</span>
            Occupancy
          </span>
          <span className="text-sm font-bold text-white">{occupancyRate}%</span>
          <span className="text-[10px] text-emerald-400/80">{occupiedUnits} Leased</span>
        </div>

        {/* Facilities */}
        <div className="p-2.5 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 flex flex-col items-center text-center">
          <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider flex items-center gap-1 mb-0.5">
            <span className="material-symbols-outlined text-[13px]">apartment</span>
            Amenities
          </span>
          <span className="text-sm font-bold text-white">{facilityCount}</span>
          <span className="text-[10px] text-on-surface-variant/70">Facilities</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/30">
        {/* View Units Primary Action */}
        <Link
          href={`/admin/units?property=${property.property_id}`}
          className="flex-1 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs pressable"
        >
          <span>View Units</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </Link>

        {/* Edit Button */}
        <button
          type="button"
          onClick={() => onEdit(property)}
          className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant hover:text-white text-on-surface border border-outline-variant/60 text-xs font-semibold flex items-center justify-center gap-1 transition-all pressable"
          title="Edit Property Details"
        >
          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">edit</span>
          <span className="hidden sm:inline">Edit</span>
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onDelete(property)}
          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-all pressable"
          title="Delete Property"
        >
          <span className="material-symbols-outlined text-[15px] text-rose-400">delete</span>
        </button>
      </div>
    </div>
  );
}
