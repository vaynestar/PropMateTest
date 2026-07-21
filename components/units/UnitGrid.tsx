"use client";

import { useMemo } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";

export default function UnitGrid({ units, removeAction }: { units: any[]; removeAction: (formData: FormData) => void }) {
  // Group units by floor_number
  const unitsByFloor = useMemo(() => {
    const grouped = units.reduce((acc, unit) => {
      const floor = unit.floor_number;
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(unit);
      return acc;
    }, {} as Record<number, any[]>);

    // Sort floors descending (highest floor on top)
    const sortedFloors = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => b - a);

    return sortedFloors.map((floor) => ({
      floor,
      units: grouped[floor].sort((a: any, b: any) => a.unit_number.localeCompare(b.unit_number)),
    }));
  }, [units]);

  if (units.length === 0) {
    return (
      <div className="p-8 text-center text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
        No units found for this property.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {unitsByFloor.map(({ floor, units }) => (
        <div key={floor} className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2 bg-primary/20" />
          <h3 className="text-lg font-bold text-on-surface mb-4 pl-2 border-b border-outline-variant/30 pb-2">
            Floor {floor}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {units.map((unit: any) => (
              <div
                key={unit.unit_id}
                className="bg-surface-container border border-outline-variant/50 rounded-lg p-3 hover:border-primary/50 transition-all flex flex-col items-center justify-center text-center group relative"
              >
                <span className="font-title-md text-title-md text-on-surface mb-1">
                  {unit.unit_number}
                </span>
                <StatusBadge status={unit.status} />
                
                {/* Delete button appears on hover */}
                <form action={removeAction} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input type="hidden" name="unit_id" value={unit.unit_id} />
                  <button
                    type="submit"
                    className="bg-error text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                    title="Remove Unit"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
