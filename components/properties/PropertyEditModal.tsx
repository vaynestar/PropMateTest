"use client";

import { useActionState, useEffect, useState } from "react";
import { editProperty } from "@/app/admin/properties/actions";

interface PropertyEditModalProps {
  property: {
    property_id: string;
    property_name: string;
    property_type: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    total_units?: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const PROPERTY_TYPES = [
  "Condominium",
  "Apartment",
  "Serviced Residence",
  "Gated Community",
  "Townhouse",
  "Commercial Strata",
  "Mixed Development",
];

const MALAYSIAN_STATES = [
  "Selangor",
  "W.P. Kuala Lumpur",
  "Johor",
  "Penang",
  "Perak",
  "Negeri Sembilan",
  "Melaka",
  "Kedah",
  "Pahang",
  "Sabah",
  "Sarawak",
  "Terengganu",
  "Kelantan",
  "Perlis",
  "W.P. Putrajaya",
  "W.P. Labuan",
];

export default function PropertyEditModal({ property, isOpen, onClose }: PropertyEditModalProps) {
  const [state, formAction, isPending] = useActionState(editProperty, null);
  const [selectedType, setSelectedType] = useState(property?.property_type || "Condominium");
  const [selectedState, setSelectedState] = useState(property?.state || "Selangor");

  useEffect(() => {
    if (property) {
      setSelectedType(property.property_type || "Condominium");
      setSelectedState(property.state || "Selangor");
    }
  }, [property]);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface-container border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Property Details</h2>
              <p className="text-xs text-on-surface-variant">Update strata configuration and address information</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {state?.error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-rose-400 text-[18px]">error</span>
              <span>{state.error}</span>
            </div>
          )}

          {state?.success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
              <span>{state.message}</span>
            </div>
          )}

          <form action={formAction} id="edit-property-form" className="space-y-4">
            <input type="hidden" name="property_id" value={property.property_id} />

            {/* Property Name */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Property Name *</label>
                <span className="text-[11px] text-on-surface-variant">Official development title</span>
              </div>
              <input
                name="property_name"
                defaultValue={property.property_name}
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Property Category & Declared Units */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Property Category *</label>
                  <span className="text-[11px] text-on-surface-variant">Strata type</span>
                </div>
                <select
                  name="property_type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white outline-none focus:border-primary transition-all"
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-surface-container-high text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Planned Unit Capacity</label>
                  <span className="text-[11px] text-on-surface-variant">Total units</span>
                </div>
                <input
                  name="total_units"
                  type="number"
                  min="0"
                  defaultValue={property.total_units || 0}
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label className="text-xs font-semibold text-white">Street Address *</label>
                <span className="text-[11px] text-on-surface-variant">Jalan / Lorong & building number</span>
              </div>
              <input
                name="address"
                defaultValue={property.address}
                required
                className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3.5 py-2.5 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
              />
            </div>

            {/* City, State, Postal Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">City *</label>
                  <span className="text-[11px] text-on-surface-variant">Bandar</span>
                </div>
                <input
                  name="city"
                  defaultValue={property.city}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">State *</label>
                  <span className="text-[11px] text-on-surface-variant">Negeri</span>
                </div>
                <select
                  name="state"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3 py-2 text-xs text-white outline-none focus:border-primary transition-all"
                >
                  {MALAYSIAN_STATES.map((st) => (
                    <option key={st} value={st} className="bg-surface-container-high text-white">
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-semibold text-white">Postal Code *</label>
                  <span className="text-[11px] text-on-surface-variant">Poskod</span>
                </div>
                <input
                  name="postal_code"
                  defaultValue={property.postal_code}
                  required
                  className="w-full rounded-xl bg-surface-container-high border border-outline-variant/60 px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <input type="hidden" name="country" value={property.country || "Malaysia"} />
          </form>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 border-t border-outline-variant/40 bg-surface-container-high/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant border border-outline-variant/60 text-xs font-semibold text-on-surface-variant hover:text-white transition-all pressable"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-property-form"
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-md pressable disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin-slow text-[16px]">progress_activity</span>
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
