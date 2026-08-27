"use client";

import { useActionState, useEffect, useState } from "react";
import { adminRegisterVisitor } from "./actions";

interface PropertyOption {
  property_id: string;
  property_name: string;
}

interface LeaseOption {
  lease_id: string;
  unit: {
    unit_id: string;
    unit_number: string;
    property_id: string;
  };
  tenant: {
    user_name: string;
  };
}

export default function AdminVisitorForm({
  leases,
  properties,
  defaultPropertyId,
}: {
  leases: LeaseOption[];
  properties: PropertyOption[];
  defaultPropertyId?: string;
}) {
  const [state, formAction, isPending] = useActionState(adminRegisterVisitor, null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form interactive state
  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropertyId || properties[0]?.property_id || "");
  const [visitorType, setVisitorType] = useState<"Resident Guest" | "Contractor" | "Delivery" | "Official" | "General">("Resident Guest");
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [destinationPreset, setDestinationPreset] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [isCustomDestination, setIsCustomDestination] = useState(false);

  // Filter leases for the selected property
  const propertyLeases = leases.filter(
    (l) => !selectedPropertyId || l.unit.property_id === selectedPropertyId
  );

  const destinationOptions = [
    "🏢 Management Office (Ground Floor)",
    "📦 Main Lobby / Guardhouse Mailroom",
    "🛗 Lift Motor Room & Service Shaft",
    "🏊 Recreation Deck & Pool Pump Room",
    "⚡ TNB Substation & Switch Room",
    "🗑️ Refuse Chamber & Bin Center",
    "🚗 Carpark & Loading Bay",
    "🏠 Vacant Unit (Showroom / Viewing)",
  ];

  useEffect(() => {
    if (state?.success) {
      setIsSuccess(true);
      // Reset form fields
      setSelectedLeaseId("");
      setDestinationPreset("");
      setCustomDestination("");
      setIsCustomDestination(false);
      setTimeout(() => setIsSuccess(false), 3500);
    }
  }, [state]);

  const handlePresetSelect = (preset: string) => {
    setDestinationPreset(preset);
    setCustomDestination(preset);
    setIsCustomDestination(false);
  };

  return (
    <div className="bg-surface-container border border-outline-variant/60 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      {isSuccess && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="font-medium">Visitor successfully registered and added to directory.</span>
        </div>
      )}

      {state?.error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="material-symbols-outlined text-rose-400 text-[20px]">error</span>
          <span className="font-medium">{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Hidden Destination Input */}
        <input
          type="hidden"
          name="destination"
          value={
            visitorType === "Resident Guest"
              ? propertyLeases.find((l) => l.lease_id === selectedLeaseId)
                ? `Unit ${propertyLeases.find((l) => l.lease_id === selectedLeaseId)?.unit.unit_number}`
                : "Resident Unit"
              : isCustomDestination
              ? customDestination
              : destinationPreset || customDestination || "General Property"
          }
        />

        {/* 1. VISITOR CATEGORY / TYPE SELECTOR */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
            Visitor Classification
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-surface-container-lowest p-1.5 rounded-xl border border-outline-variant/40">
            {(
              [
                { id: "Resident Guest", icon: "person", label: "Resident Guest" },
                { id: "Contractor", icon: "construction", label: "Contractor" },
                { id: "Delivery", icon: "local_shipping", label: "Delivery" },
                { id: "Official", icon: "policy", label: "Official / Audit" },
                { id: "General", icon: "badge", label: "General Walk-in" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setVisitorType(t.id);
                  if (t.id === "Resident Guest") {
                    setDestinationPreset("");
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all text-center ${
                  visitorType === t.id
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="visitor_type" value={visitorType} />
        </div>

        {/* 2. TARGET PROPERTY & DESTINATION SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Target Property */}
          <div className="space-y-1.5">
            <label htmlFor="property_id" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Target Property
            </label>
            <select
              id="property_id"
              name="property_id"
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setSelectedLeaseId("");
              }}
              required
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>
                  🏢 {p.property_name}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Destination based on Visitor Type */}
          {visitorType === "Resident Guest" ? (
            <div className="space-y-1.5">
              <label htmlFor="lease_id" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Visiting Resident / Unit
              </label>
              <select
                id="lease_id"
                name="lease_id"
                value={selectedLeaseId}
                onChange={(e) => setSelectedLeaseId(e.target.value)}
                required
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="">Select occupied unit & host...</option>
                {propertyLeases.map((l) => (
                  <option key={l.lease_id} value={l.lease_id}>
                    Unit {l.unit.unit_number} — {l.tenant.user_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Destination / Area
              </label>
              <select
                value={isCustomDestination ? "__custom__" : destinationPreset}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustomDestination(true);
                    setCustomDestination("");
                  } else {
                    handlePresetSelect(e.target.value);
                  }
                }}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="">Select destination preset...</option>
                {destinationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="__custom__">✏️ Custom Specific Location...</option>
              </select>
            </div>
          )}

          {/* Custom destination input if selected */}
          {visitorType !== "Resident Guest" && isCustomDestination && (
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="custom_dest" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Specific Location Details
              </label>
              <input
                type="text"
                id="custom_dest"
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                placeholder="e.g., Level 3 Corridor, Unit A-08 Renovation, Security Control Room"
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* 3. VISITOR IDENTIFICATION & CREDENTIALS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {/* Visitor Name */}
          <div className="space-y-1.5">
            <label htmlFor="visitor_name" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Visitor / Contractor Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="visitor_name"
              name="visitor_name"
              required
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              placeholder={visitorType === "Contractor" ? "e.g. John (Schindler Lifts)" : "Full Name"}
            />
          </div>

          {/* IC / Passport */}
          <div className="space-y-1.5">
            <label htmlFor="visitor_ic_no" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              IC / Passport No. <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="visitor_ic_no"
              name="visitor_ic_no"
              required
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              placeholder="e.g. 900101-14-5566"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label htmlFor="contact_no" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Contact Phone (Optional)
            </label>
            <input
              type="text"
              id="contact_no"
              name="contact_no"
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              placeholder="e.g. 012-3456789"
            />
          </div>

          {/* Vehicle Plate */}
          <div className="space-y-1.5">
            <label htmlFor="vehicle_plate" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Vehicle Plate (Optional)
            </label>
            <input
              type="text"
              id="vehicle_plate"
              name="vehicle_plate"
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs uppercase font-mono placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              placeholder="e.g. WXY 1234"
            />
          </div>

          {/* Visit Date */}
          <div className="space-y-1.5">
            <label htmlFor="visit_date" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Visit Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              id="visit_date"
              name="visit_date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          {/* Initial Status */}
          <div className="space-y-1.5">
            <label htmlFor="status" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Initial Check-in Status
            </label>
            <select
              id="status"
              name="status"
              required
              defaultValue="Approved"
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs font-medium focus:outline-none focus:border-primary"
            >
              <option value="Approved">🟢 Approved (Pre-authorized)</option>
              <option value="Checked In">⚡ Checked In Immediately</option>
              <option value="Pending">⏳ Pending Approval</option>
            </select>
          </div>

          {/* Purpose of Visit */}
          <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
            <label htmlFor="visit_purpose" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Purpose of Visit / Work Scope <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="visit_purpose"
              name="visit_purpose"
              required
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3.5 py-2.5 text-white text-xs placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
              placeholder={
                visitorType === "Contractor"
                  ? "e.g. Lift Servicing & Cable Inspection"
                  : visitorType === "Delivery"
                  ? "e.g. Parcel drop-off for Block A residents"
                  : "e.g. Family gathering / Social visit"
              }
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 py-2.5 rounded-xl text-white font-semibold text-xs shadow-lg hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 pressable"
          >
            {isPending ? (
              <span className="material-symbols-outlined text-[18px] animate-spin-slow">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            )}
            <span>{isPending ? "Registering Visitor..." : "Register Visitor Pass"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
