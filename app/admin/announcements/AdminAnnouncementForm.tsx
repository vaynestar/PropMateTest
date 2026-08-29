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
  { id: "Notice", label: "Notice", icon: "campaign", activeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { id: "Maintenance", label: "Maintenance", icon: "build", activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { id: "Emergency", label: "Emergency", icon: "warning", activeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  { id: "Security", label: "Security", icon: "shield", activeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { id: "Event", label: "Event", icon: "celebration", activeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { id: "Billing", label: "Billing", icon: "payments", activeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
];

export default function AdminAnnouncementForm({
  properties,
  defaultPropertyId,
  initialData,
  onSuccess,
  onCancel,
}: AdminAnnouncementFormProps) {
  const isEditing = Boolean(initialData);

  // Main Fields
  const [category, setCategory] = useState(initialData?.category || "Notice");
  const [priority, setPriority] = useState(initialData?.priority || "Normal");
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);
  const [status, setStatus] = useState(initialData?.status || "Published");

  // Advanced / Optional Settings (Accordion State)
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initialData?.image_url ||
      initialData?.attachment_url ||
      (initialData?.target_audience && initialData.target_audience !== "All") ||
      (initialData?.property_id && initialData.property_id !== defaultPropertyId)
    )
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialData ? initialData.property_id || "ALL" : defaultPropertyId || "ALL"
  );
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

  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [attachmentUrl, setAttachmentUrl] = useState(initialData?.attachment_url || "");

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
      formData.set("image_url", imageUrl);
      formData.set("attachment_url", attachmentUrl);

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
    <div className="bg-[#111625] border border-outline-variant/60 rounded-3xl p-5 sm:p-7 shadow-2xl text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[20px]">
              {isEditing ? "edit_note" : "campaign"}
            </span>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
              {isEditing ? "Edit Announcement" : "New Announcement"}
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-1">
              {isEditing ? "Update circular details and schedule" : "Broadcast a notice to the resident bulletin board"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Status Selector */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-surface-container border border-outline-variant/60 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="Published">🟢 Published</option>
            <option value="Draft">📝 Draft</option>
            <option value="Archived">📦 Archived</option>
          </select>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {state?.error && (
        <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="mt-5 space-y-4">
        {/* CATEGORY & URGENCY PILL BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-surface-container-lowest border border-outline-variant/40">
          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all pressable ${
                    isSelected
                      ? `${cat.activeClass} border shadow-xs`
                      : "text-on-surface-variant hover:text-white hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Priority & Pin Actions */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-outline-variant/30">
            {/* Priority Button */}
            <button
              type="button"
              onClick={() => {
                const nextPriority = priority === "Normal" ? "High" : priority === "High" ? "Urgent" : "Normal";
                setPriority(nextPriority);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                priority === "Urgent"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : priority === "High"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-surface-container text-on-surface-variant border-outline-variant/60 hover:text-white"
              }`}
              title="Click to toggle priority level (Normal -> High -> Urgent)"
            >
              <span className="material-symbols-outlined text-[14px]">
                {priority === "Urgent" ? "emergency" : priority === "High" ? "priority_high" : "check"}
              </span>
              <span>{priority}</span>
            </button>

            {/* Pin Button */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1 px-2 rounded-xl text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
                isPinned
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-surface-container text-on-surface-variant border-outline-variant/60 hover:text-white"
              }`}
              title="Pin announcement to top of resident feed"
            >
              <span className="material-symbols-outlined text-[14px] text-amber-400">push_pin</span>
              <span>{isPinned ? "Pinned" : "Pin"}</span>
            </button>
          </div>
        </div>

        {/* TITLE INPUT (Hero) */}
        <div className="space-y-1">
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={initialData?.title || ""}
            required
            placeholder="Announcement title or subject..."
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-2xl px-4 py-3 text-base sm:text-lg font-bold text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* CONTENT TEXTAREA */}
        <div className="space-y-1">
          <textarea
            id="content"
            name="content"
            rows={6}
            defaultValue={initialData?.content || ""}
            required
            placeholder="Write announcement details, affected units/areas, schedule, instructions, or contact info here..."
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-gray-200 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y leading-relaxed font-sans"
          />
        </div>

        {/* EXPANDABLE ADVANCED OPTIONS (Progressive Disclosure) */}
        <div className="border border-outline-variant/40 rounded-2xl bg-surface-container-lowest/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-on-surface-variant hover:text-white transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] text-primary">tune</span>
              <span className="font-semibold text-white">Target Scope, Dates & Attachments</span>
              <span className="text-[10px] text-on-surface-variant/70">
                ({selectedPropertyId === "ALL" ? "All Properties" : "1 Property"} • {targetAudience})
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px]">
              {showAdvanced ? "expand_less" : "expand_more"}
            </span>
          </button>

          {showAdvanced && (
            <div className="p-4 pt-2 border-t border-outline-variant/30 space-y-3.5 text-xs animate-in fade-in duration-150">
              {/* Target Property & Audience Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Target Property
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">🌐 All Managed Properties (Universal)</option>
                    {properties.map((p) => (
                      <option key={p.property_id} value={p.property_id}>
                        🏢 {p.property_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="All">👥 All Residents (Tenants & Owners)</option>
                    <option value="Tenants">🏠 Tenants Only</option>
                    <option value="Owners">🔑 Property Owners Only</option>
                  </select>
                </div>
              </div>

              {/* Date Range Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Publish Date
                  </label>
                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Cover Image & PDF Attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Cover Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Attachment PDF / Circular Document URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="https://.../notice_circular.pdf"
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant hover:bg-surface-container-high text-white text-xs font-semibold transition-colors pressable"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg pressable"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isPending ? "sync" : "send"}
            </span>
            <span>{isPending ? "Saving..." : isEditing ? "Save Changes" : "Publish Announcement"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
