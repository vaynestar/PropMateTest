"use client";

import { useState, useTransition } from "react";
import { raiseTicketAction } from "@/app/admin/maintenance/actions";

type PropertyItem = {
  property_id: string;
  property_name: string;
};

type UnitItem = {
  unit_id: string;
  unit_number: string;
  property_id: string;
  property: {
    property_name: string;
  };
};

type CategoryItem = {
  category_id: string;
  category_name: string;
  description?: string | null;
  is_active: boolean;
};

type AdminRaiseTicketFormProps = {
  properties: PropertyItem[];
  occupiedUnits: UnitItem[];
  categories: CategoryItem[];
  defaultPropertyId: string;
};

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function AdminRaiseTicketForm({
  properties,
  occupiedUnits,
  categories,
  defaultPropertyId,
}: AdminRaiseTicketFormProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultPropertyId && properties.some((p) => p.property_id === defaultPropertyId)
      ? defaultPropertyId
      : "ALL"
  );
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter occupied units based on selected property in ticket form
  const filteredUnits = selectedPropertyId === "ALL"
    ? occupiedUnits
    : occupiedUnits.filter((u) => u.property_id === selectedPropertyId);

  const activeCategories = categories.filter((c) => c.is_active);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const formEl = e.currentTarget;

    startTransition(async () => {
      const res = await raiseTicketAction(formData);
      if (res?.error) {
        setToast({ message: res.error, type: "error" });
      } else if (res?.success) {
        setToast({ message: res.message, type: "success" });
        formEl.reset();
      }
      setTimeout(() => setToast(null), 5000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      {toast && (
        <div
          className={`md:col-span-2 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
            toast.type === "success"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-rose-500/20 text-rose-300 border-rose-500/40"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Property Selector */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">
          Property (Filter Units)
        </label>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
        >
          <option value="ALL">📋 All Properties</option>
          {properties.map((p) => (
            <option key={p.property_id} value={p.property_id}>
              🏢 {p.property_name} {p.property_id === defaultPropertyId ? " (Current Active)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Unit Selector (Filtered by Property) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">
          Occupied Unit <span className="text-rose-400">*</span>
        </label>
        <select
          name="unit_id"
          required
          defaultValue=""
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
        >
          <option value="">
            {filteredUnits.length === 0
              ? "No occupied units under selected property"
              : "Select occupied unit..."}
          </option>
          {filteredUnits.map((u) => (
            <option key={u.unit_id} value={u.unit_id}>
              {u.unit_number} · {u.property.property_name}
            </option>
          ))}
        </select>
      </div>

      {/* Ticket Category Dropdown (From Category Master) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">
          Category <span className="text-rose-400">*</span>
        </label>
        <select
          name="ticket_category"
          required
          defaultValue={activeCategories[0]?.category_name || "General Maintenance"}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
        >
          {activeCategories.map((c) => (
            <option key={c.category_id} value={c.category_name}>
              {c.category_name}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">Priority</label>
        <select
          name="priority"
          defaultValue="Medium"
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Issue Title */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">
          Issue Title <span className="text-rose-400">*</span>
        </label>
        <input
          name="title"
          placeholder="Issue title (e.g., AC leaking water in master bedroom)"
          required
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm"
        />
      </div>

      {/* Description */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">Description</label>
        <textarea
          name="description"
          placeholder="Describe the maintenance problem or tenant report details..."
          required
          rows={3}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary text-sm resize-none"
        />
      </div>

      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 flex items-center justify-center gap-2 transition-all pressable disabled:opacity-50"
        >
          {isPending ? (
            <span className="material-symbols-outlined animate-spin-slow text-[18px]">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">add_alert</span>
          )}
          {isPending ? "Raising Ticket..." : "Raise Ticket"}
        </button>
      </div>
    </form>
  );
}
