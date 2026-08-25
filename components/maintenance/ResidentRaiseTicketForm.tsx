"use client";

import { useState, useTransition } from "react";

type CategoryItem = {
  category_id: string;
  category_name: string;
};

type ResidentRaiseTicketFormProps = {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  categories: CategoryItem[];
  raiseAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
};

const COMMON_AREA_PRESETS = [
  "Hallway / Corridor",
  "Passenger Lift / Lift Lobby",
  "Carpark / Driveway",
  "Swimming Pool & Pool Deck",
  "Resident Gym & Fitness Area",
  "Security Guardhouse / Main Gate",
  "Refuse Room & Waste Chute",
  "Staircase / Fire Exit",
  "Surrounding Landscape & Playground",
  "EV Charging Hub",
  "Others / Custom Location",
];

export default function ResidentRaiseTicketForm({
  unitId,
  unitNumber,
  propertyId,
  propertyName,
  categories,
  raiseAction,
}: ResidentRaiseTicketFormProps) {
  const [locationType, setLocationType] = useState<"Unit" | "Common Area">("Unit");
  const [commonAreaPreset, setCommonAreaPreset] = useState("Hallway / Corridor");
  const [locationDetail, setLocationDetail] = useState("Hallway / Corridor");
  const [isDetailCustomized, setIsDetailCustomized] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
      const res = await raiseAction(formData);
      if (res?.error) {
        setToast({ message: res.error, type: "error" });
      } else {
        setToast({ message: "Helpdesk request submitted successfully!", type: "success" });
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

      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="location_type" value={locationType} />
      {locationType === "Unit" && <input type="hidden" name="unit_id" value={unitId} />}

      {/* Location Scope Toggle */}
      <div className="space-y-1 md:col-span-2">
        <label className="text-xs font-medium text-on-surface-variant block">
          Issue Location <span className="text-rose-400">*</span>
        </label>
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
            <span>My Unit ({unitNumber})</span>
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

      {/* Conditional: Common Area Details */}
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
                Location Specifics <span className="text-rose-400">*</span>
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
              placeholder={`e.g. Level 3 Hallway, Lift A, Carpark Bay 12`}
              required={locationType === "Common Area"}
              className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-sm"
            />
          </div>
        </>
      )}

      {/* Ticket Category */}
      <div className="space-y-1 md:col-span-2">
        <label className="text-xs font-medium text-on-surface-variant">
          Category <span className="text-rose-400">*</span>
        </label>
        <select
          name="ticket_category"
          required
          defaultValue={categories[0]?.category_name ?? "General Maintenance"}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface outline-none focus:border-primary text-sm"
        >
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_name}>
              {c.category_name}
            </option>
          ))}
          {categories.length === 0 && (
            <>
              <option value="General Maintenance">General Maintenance</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Security">Security</option>
              <option value="Others">Others</option>
            </>
          )}
        </select>
      </div>

      {/* Title */}
      <div className="space-y-1 md:col-span-2">
        <label className="text-xs font-medium text-on-surface-variant">
          Issue Title <span className="text-rose-400">*</span>
        </label>
        <input
          name="title"
          placeholder="Brief summary of the issue (e.g. Hallway light not working, Water leaking)"
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
          placeholder="Describe what happened and any details that can help management fix it..."
          required
          rows={3}
          className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:border-primary text-sm resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary px-6 py-2.5 font-label-md text-label-md flex items-center justify-center gap-2 transition-all md:col-span-2 rounded-lg text-white shadow-sm hover:brightness-110 disabled:opacity-50 pressable"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isPending ? "sync" : "add_alert"}
        </span>
        <span>{isPending ? "Submitting Request..." : "Submit Request"}</span>
      </button>
    </form>
  );
}
