"use client";

import { useMemo, useActionState, useEffect, useState } from "react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { removeUnit } from "@/app/admin/units/actions";

function DeleteUnitButton({ unitId }: { unitId: string }) {
  const [state, formAction, isPending] = useActionState(removeUnit, null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state?.error) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <input type="hidden" name="unit_id" value={unitId} />
      <button
        type="submit"
        disabled={isPending}
        className="bg-red-500/90 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm disabled:opacity-50 pressable"
        title="Remove Unit"
      >
        {isPending ? (
          <span className="material-symbols-outlined animate-spin-slow text-[14px]">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[14px]">close</span>
        )}
      </button>

      {showError && (
        <div className="absolute bottom-full right-0 mb-1 w-max p-1.5 rounded bg-rose-500 text-white text-xs shadow-lg animate-fade-in whitespace-nowrap">
          {state?.error}
        </div>
      )}
    </form>
  );
}

export default function UnitGrid({ units }: { units: any[] }) {
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
    <div className="flex flex-col gap-8 p-6">
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
                <DeleteUnitButton unitId={unit.unit_id} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
