"use client";

import { useActionState, useEffect, useState } from "react";
import { createAnnouncement, updateAnnouncement } from "./actions";

interface PropertyOption {
  property_id: string;
  property_name: string;
}

interface AnnouncementData {
  announcement_id: string;
  property_id?: string | null;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  is_pinned: boolean;
  target_audience: string;
  image_url?: string | null;
  attachment_url?: string | null;
  publish_date: Date | string;
  expiry_date: Date | string;
}

interface AdminAnnouncementFormProps {
  properties: PropertyOption[];
  defaultPropertyId?: string;
  initialData?: AnnouncementData | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  { id: "Notice", label: "General Notice", icon: "campaign", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { id: "Maintenance", label: "Maintenance & Disruption", icon: "build", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "Emergency", label: "Emergency Alert", icon: "warning", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { id: "Security", label: "Security Advisory", icon: "shield", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "Event", label: "Community Event", icon: "celebration", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { id: "Billing", label: "Billing & Admin", icon: "payments", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
];

const PRIORITIES = [
  { id: "Normal", label: "Normal", badge: "bg-slate-700/60 text-slate-300 border-slate-600" },
  { id: "High", label: "High Priority", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "Urgent", label: "🚨 Urgent / Critical", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse" },
];

export default function AdminAnnouncementForm({
  properties,
  defaultPropertyId,
  initialData,
  onSuccess,
  onCancel,
}: AdminAnnouncementFormProps) {
  const isEditing = Boolean(initialData);

  const [category, setCategory] = useState(initialData?.category || "Notice");
  const [priority, setPriority] = useState(initialData?.priority || "Normal");
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialData ? initialData.property_id || "ALL" : defaultPropertyId || "ALL"
  );
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);
  const [status, setStatus] = useState(initialData?.status || "Published");
  const [targetAudience, setTargetAudience] = useState(initialData?.target_audience || "All");

  const [publishDate, setPublishDate] = useState(
    initialData?.publish_date
      ? new Date(initialData.publish_date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiry_date
      ? new Date(initialData.expiry_date).toISOString().split("T")[0]
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d.toISOString().split("T")[0];
        })()
  );

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      formData.set("category", category);
      formData.set("priority", priority);
      formData.set("property_id", selectedPropertyId);
      formData.set("status", status);
      formData.set("target_audience", targetAudience);
      formData.set("is_pinned", isPinned ? "true" : "false");
      formData.set("publish_date", publishDate);
      formData.set("expiry_date", expiryDate);

      if (isEditing && initialData) {
        return await updateAnnouncement(initialData.announcement_id, formData);
      }
      return await createAnnouncement(prevState, formData);
    },
    null
  );

  useEffect(() => {
    if (state?.success) {
      if (onSuccess) onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      <div className="flex items-center justify-between pb-4 mb-5 border-b border-outline-variant/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[22px]">
              {isEditing ? "edit_note" : "campaign"}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isEditing ? "Edit Announcement" : "Broadcast New Announcement"}
            </h2>
            <p className="text-xs text-on-surface-variant">
              Post notices, emergency advisories, and circulars to resident noticeboards
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {state?.error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Announcement {isEditing ? "updated" : "published"} successfully!</span>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* CATEGORY SELECTOR */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
            Notice Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-semibold pressable ${
                    isSelected
                      ? `${cat.color} ring-1 ring-primary shadow-sm font-bold`
                      : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-white hover:border-outline"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRIORITY & STATUS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Urgency & Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center text-xs font-semibold transition-all pressable ${
                      isSelected
                        ? `${p.badge} ring-1 ring-primary font-bold shadow-md`
                        : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Publish Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="Published">🟢 Live (Published)</option>
              <option value="Draft">📝 Save as Draft</option>
              <option value="Archived">📦 Archived</option>
            </select>
          </div>
        </div>

        {/* TARGET PROPERTY & AUDIENCE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Target Property
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="ALL">🌐 Broadcast to All Managed Properties</option>
              {properties.map((p) => (
                <option key={p.property_id} value={p.property_id}>
                  🏢 {p.property_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="All">👥 All Residents (Tenants & Owners)</option>
              <option value="Tenants">🏠 Tenants Only</option>
              <option value="Owners">🔑 Property Owners Only</option>
            </select>
          </div>
        </div>

        {/* TITLE */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-xs font-bold text-on-surface uppercase tracking-wider block">
            Announcement Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={initialData?.title || ""}
            required
            placeholder="e.g. Scheduled Water Disruption & Tank Cleaning — Level 1 to 20"
            className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* CONTENT */}
        <div className="space-y-1.5">
          <label htmlFor="content" className="text-xs font-bold text-on-surface uppercase tracking-wider block">
            Announcement Body & Details <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows={5}
            defaultValue={initialData?.content || ""}
            required
            placeholder="Provide complete details, affected areas, dates, times, alternative arrangements, and contact person..."
            className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-y leading-relaxed font-sans"
          />
        </div>

        {/* DATE RANGE & PINNED TOGGLE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Publish Date
            </label>
            <input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
            />
          </div>

          <div className="pb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/40 transition-colors">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary bg-surface-container-high border-outline-variant cursor-pointer"
              />
              <span className="text-xs font-semibold text-white flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-amber-400">push_pin</span>
                <span>Pin to top of feed</span>
              </span>
            </label>
          </div>
        </div>

        {/* COVER IMAGE & ATTACHMENT URLS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="image_url" className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Cover Image URL (Optional)
            </label>
            <input
              type="url"
              id="image_url"
              name="image_url"
              defaultValue={initialData?.image_url || ""}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="attachment_url" className="text-xs font-bold text-on-surface uppercase tracking-wider block">
              Attachment PDF / Document URL (Optional)
            </label>
            <input
              type="url"
              id="attachment_url"
              name="attachment_url"
              defaultValue={initialData?.attachment_url || ""}
              placeholder="https://.../notice_circular.pdf"
              className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/40">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl bg-surface-container border border-outline-variant hover:bg-surface-container-high text-white text-xs font-semibold transition-colors pressable"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg pressable"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPending ? "sync" : "send"}
            </span>
            <span>{isPending ? "Processing..." : isEditing ? "Save Changes" : "Publish Announcement"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
