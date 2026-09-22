"use client";

import { useState, useMemo } from "react";
import ScrollHint from "@/components/ui/ScrollHint";
import PropertyCard, { PropertyData } from "./PropertyCard";
import PropertyFormModal from "./PropertyFormModal";
import PropertyEditModal from "./PropertyEditModal";
import PropertyDeleteModal from "./PropertyDeleteModal";
import { FIELD, StatCard, StatGrid } from "@/components/admin/ui";

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
  const emptyProperties = initialProperties.filter((p) => (p._count?.units ?? 0) === 0).length;
  const activeDefaultProperty = initialProperties.find((p) => p.property_id === activePropertyId);

  // Available unique property types for filter pills
  const availableTypes = useMemo(() => {
    const types = new Set(initialProperties.map((p) => p.property_type).filter(Boolean));
    return Array.from(types);
  }, [initialProperties]);

  return (
    <div className="space-y-5">
      <StatGrid>
        <StatCard
          label="Total properties"
          value={totalProperties}
          hint={emptyProperties === 0 ? "all have units" : `${emptyProperties} with no units yet`}
          icon="domain"
          tone="primary"
        />
        <StatCard label="Units" value={totalUnits} hint="across all properties" icon="meeting_room" tone="neutral" />
        <StatCard
          label="Occupancy"
          value={`${avgOccupancyRate}%`}
          hint={`${totalOccupied} of ${totalUnits} leased`}
          icon="pie_chart"
          tone="positive"
          progress={avgOccupancyRate}
        />
        <StatCard
          label="Working in"
          value={
            <span className="block text-base leading-snug" title={activeDefaultProperty?.property_name}>
              {activeDefaultProperty?.property_name || "No default set"}
            </span>
          }
          icon="star"
          tone="warning"
          footer={{ label: "Default for new sessions", value: activeDefaultProperty ? "Set" : "None" }}
        />
      </StatGrid>

      {/* Control Bar: Search, Type Filter & Add Property Action */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-outline-variant/60 bg-gradient-to-br from-white/[0.06] via-surface-container to-surface-container p-3 md:flex-row md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, city, state or address"
            className={`${FIELD} w-full pl-9 placeholder:text-on-surface-variant/60`}
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
        <ScrollHint><div className="flex items-center gap-2">
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
        </div></ScrollHint>
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
          <div className="col-span-full rounded-2xl border border-outline-variant/40 bg-surface-container py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[28px] opacity-40">domain_disabled</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No properties match</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {searchQuery || selectedType !== "ALL"
                  ? "Try a different name, city or type."
                  : "Add your first property to start tracking units."}
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
