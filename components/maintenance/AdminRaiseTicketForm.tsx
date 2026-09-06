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
  /** Shown beside the number so a vacant unit is obvious when picking one. */
  status?: string | null;
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

const COMMON_AREA_PRESETS = [
  "Hallway / Corridor",
  "Passenger Lift / Lift Lobby",
  "Carpark / Driveway & Ramps",
  "Swimming Pool & Pool Deck",
  "Resident Gym & Fitness Area",
  "Security Guardhouse & Boom Gate",
  "Refuse Room & Waste Chute",
  "Roof & Sky Garden",
  "Staircase & Emergency Fire Exit",
  "Management Office & Reception",
  "Surrounding Landscape & Playground",
  "EV Charging Station Hub",
  "Others / Custom Location",
];

export default function AdminRaiseTicketForm({
  properties,
  occupiedUnits,
  categories,
  defaultPropertyId,
}: AdminRaiseTicketFormProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultPropertyId && properties.some((p) => p.property_id === defaultPropertyId)
      ? defaultPropertyId
      : (properties[0]?.property_id ?? "ALL")
  );
  const activePropertyName =
    properties.find((p) => p.property_id === defaultPropertyId)?.property_name ?? "this property";
  const [locationType, setLocationType] = useState<"Unit" | "Common Area">("Unit");
  const [commonAreaPreset, setCommonAreaPreset] = useState("Hallway / Corridor");
  const [locationDetail, setLocationDetail] = useState("Hallway / Corridor");
  const [isDetailCustomized, setIsDetailCustomized] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // The page already scopes these to the active property.
  const filteredUnits = occupiedUnits;

  const activeCategories = categories.filter((c) => c.is_active);

  // When changing zone preset: update text input if user hasn't typed custom content
  const handlePresetChange = (newPreset: string) => {
    setCommonAreaPreset(newPreset);
    if (!isDetailCustomized || locationDetail === commonAreaPreset || !locationDetail.trim()) {
      setLocationDetail(newPreset);
      setIsDetailCustomized(false);
    }
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocationDetail(val);
    setIsDetailCustomized(val.trim() !== "" && val !== commonAreaPreset);
  };

  const resetToPreset = () => {
    setLocationDetail(commonAreaPreset);
    setIsDetailCustomized(false);
  };

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
        setLocationType("Unit");
        setCommonAreaPreset("Hallway / Corridor");
        setLocationDetail("Hallway / Corridor");
        setIsDetailCustomized(false);
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

      {/* The property comes from the top bar; this form only ever raises a
          ticket for the property currently in view. */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3">
        <span className="flex items-center gap-2 text-xs text-on-surface">
          <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
          Raising this for <strong className="font-bold text-primary">{activePropertyName}</strong>
        </span>
        <span className="rounded bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
          Change it in the top bar
        </span>
      </div>
      <input type="hidden" name="property_id" value={defaultPropertyId} />

      {/* Location Type Selector Toggle */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant block">
          Where is it? <span className="text-rose-400">*</span>
        </label>
        <input type="hidden" name="location_type" value={locationType} />
        <div className="grid grid-cols-2 gap-1.5 bg-surface-container-high p-1 rounded-lg border border-outline-variant">
          <button
            type="button"
            onClick={() => setLocationType("Unit")}
            className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              locationType === "Unit"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">meeting_room</span>
            <span>Specific Unit</span>
          </button>
          <button
            type="button"
            onClick={() => setLocationType("Common Area")}
            className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              locationType === "Common Area"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">domain</span>
            <span>Common Area / Hallway</span>
          </button>
        </div>
      </div>

      {/* Conditional: Unit Selector */}
      {locationType === "Unit" && (
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium text-on-surface-variant">
            Unit <span className="text-rose-400">*</span>
          </label>
          <select
            name="unit_id"
            required={locationType === "Unit"}
            defaultValue=""
            className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
          >
            <option value="">
              {filteredUnits.length === 0
                ? "This property has no units yet"
                : "Choose a unit…"}
            </option>
            {filteredUnits.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                Unit {u.unit_number}
                {u.status && u.status !== "Occupied" ? ` — ${u.status}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Conditional: Common Area / Hallway Details */}
      {locationType === "Common Area" && (
        <>
          <div className="space-y-1">
            <label className="text-xs font-medium text-on-surface-variant">
              Common Area Facility / Zone <span className="text-rose-400">*</span>
            </label>
            <select
              value={commonAreaPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm font-medium"
            >
              {COMMON_AREA_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-on-surface-variant">
                Location Specifics / Floor <span className="text-rose-400">*</span>
              </label>
              {isDetailCustomized && (
                <button
                  type="button"
                  onClick={resetToPreset}
                  className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                  title="Reset to selected zone name"
                >
                  <span className="material-symbols-outlined text-[13px]">refresh</span>
                  <span>Reset to zone</span>
                </button>
              )}
            </div>
            <input
              name="location_detail"
              value={locationDetail}
              onChange={handleDetailChange}
              placeholder={`e.g. Level 3 Hallway near Unit 302, Lift B lobby, etc.`}
              required={locationType === "Common Area"}
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-sm"
            />
          </div>
        </>
      )}

      {/* Ticket Category Dropdown (From Category Master) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">
          Category <span className="text-rose-400">*</span>
        </label>
        <select
          name="ticket_category"
          required
          defaultValue={activeCategories[0]?.category_name ?? "General Maintenance"}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
        >
          {activeCategories.map((c) => (
            <option key={c.category_id} value={c.category_name}>
              {c.category_name}
            </option>
          ))}
          {activeCategories.length === 0 && (
            <option value="General Maintenance">General Maintenance</option>
          )}
        </select>
      </div>

      {/* Priority Level Dropdown */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-on-surface-variant">
          Priority <span className="text-rose-400">*</span>
        </label>
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

      {/* Title */}
      <div className="space-y-1 md:col-span-2">
        <label className="text-xs font-medium text-on-surface-variant">
          Issue Title <span className="text-rose-400">*</span>
        </label>
        <input
          name="title"
          placeholder="Brief summary of the issue (e.g. Hallway ceiling light blinking, Water pipe leaking)"
          required
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1 md:col-span-2">
        <label className="text-xs font-medium text-on-surface-variant">
          Detailed Description <span className="text-rose-400">*</span>
        </label>
        <textarea
          name="description"
          placeholder="Provide context, observations, or technician notes about the problem..."
          required
          rows={3}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-sm resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="md:col-span-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary w-full py-2.5 rounded-lg text-white font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm hover:brightness-110 transition-all disabled:opacity-50 pressable"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isPending ? "sync" : "add_task"}
          </span>
          <span>{isPending ? "Submitting Ticket..." : "Submit Ticket"}</span>
        </button>
      </div>
    </form>
  );
}
