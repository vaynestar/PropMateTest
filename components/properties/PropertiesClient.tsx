"use client";

import { useState, useMemo } from "react";
import PropertyCard, { PropertyData } from "./PropertyCard";
import PropertyFormModal from "./PropertyFormModal";
import PropertyEditModal from "./PropertyEditModal";
import PropertyDeleteModal from "./PropertyDeleteModal";

interface PropertiesClientProps {
  initialProperties: PropertyData[];
  activePropertyId: string;
}

export default function PropertiesClient({
  initialProperties,
  activePropertyId,
}: PropertiesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyData | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<PropertyData | null>(null);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    return initialProperties.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        selectedType === "ALL" ||
        p.property_type.toLowerCase() === selectedType.toLowerCase() ||
        p.property_type.toLowerCase().includes(selectedType.toLowerCase());

      return matchesSearch && matchesType;
    });
  }, [initialProperties, searchQuery, selectedType]);

  // Aggregate Portfolio KPIs
  const totalProperties = initialProperties.length;
  const totalUnits = initialProperties.reduce((acc, p) => acc + (p._count?.units || 0), 0);
  const totalOccupied = initialProperties.reduce((acc, p) => {
    const occupied = p.units ? p.units.filter((u) => u.status === "Occupied").length : 0;
    return acc + occupied;
  }, 0);
  const avgOccupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
  const activeDefaultProperty = initialProperties.find((p) => p.property_id === activePropertyId);

  // Available unique property types for filter pills
  const availableTypes = useMemo(() => {
    const types = new Set(initialProperties.map((p) => p.property_type).filter(Boolean));
    return Array.from(types);
  }, [initialProperties]);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Properties */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Developments
            </span>
            <div className="text-2xl font-bold text-white mt-1">{totalProperties}</div>
            <span className="text-[11px] text-cyan-400 font-medium">In Management</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-[24px]">domain</span>
          </div>
        </div>

        {/* Total Registered Units */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Units
            </span>
            <div className="text-2xl font-bold text-white mt-1">{totalUnits}</div>
            <span className="text-[11px] text-violet-400 font-medium">Active Portfolio</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">meeting_room</span>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Occupancy Rate
            </span>
            <div className="text-2xl font-bold text-white mt-1">{avgOccupancyRate}%</div>
            <span className="text-[11px] text-emerald-400 font-medium">{totalOccupied} Units Leased</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-[24px]">pie_chart</span>
          </div>
        </div>

        {/* Default Property Scope */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Active Scope
            </span>
            <div className="text-sm font-bold text-amber-300 truncate mt-1">
              {activeDefaultProperty?.property_name || "All Developments"}
            </div>
            <span className="text-[11px] text-on-surface-variant/80">Default Property</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
            <span className="material-symbols-outlined text-[24px]">star</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Type Filter & Add Property Action */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by property name, city, state, or address..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-high border border-outline-variant/60 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </button>
          )}
        </div>

        {/* Right Filter Pills & Add Button */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0 bg-surface-container-high/60 p-1 rounded-xl border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === "ALL"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-white"
              }`}
            >
              All Types
            </button>
            {availableTypes.slice(0, 3).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedType === type
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Add New Property Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.map((property) => (
          <PropertyCard
            key={property.property_id}
            property={property}
            isActiveDefault={property.property_id === activePropertyId}
            onEdit={(p) => setEditingProperty(p)}
            onDelete={(p) => setDeletingProperty(p)}
          />
        ))}

        {filteredProperties.length === 0 && (
          <div className="col-span-full py-16 text-center rounded-2xl bg-surface-container border border-outline-variant/40 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px] opacity-40">domain_disabled</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No Properties Found</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {searchQuery || selectedType !== "ALL"
                  ? "No developments match your search criteria."
                  : "Get started by adding your first residential strata development."}
              </p>
            </div>
            {(searchQuery || selectedType !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("ALL");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant border border-outline-variant/60 text-xs font-semibold text-primary transition-all pressable mt-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PropertyFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <PropertyEditModal
        property={editingProperty}
        isOpen={!!editingProperty}
        onClose={() => setEditingProperty(null)}
      />

      <PropertyDeleteModal
        property={deletingProperty}
        isOpen={!!deletingProperty}
        onClose={() => setDeletingProperty(null)}
      />
    </div>
  );
}
