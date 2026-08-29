"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
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

const CATEGORY_OPTIONS = [
  { value: "Notice", label: "📢 General Notice" },
  { value: "Maintenance", label: "🔧 Maintenance & Disruption" },
  { value: "Emergency", label: "🚨 Emergency Alert" },
  { value: "Security", label: "🛡️ Security Advisory" },
  { value: "Event", label: "🎉 Community Event" },
  { value: "Billing", label: "💳 Billing & Admin" },
];

export default function AdminAnnouncementForm({
  properties,
  defaultPropertyId,
  initialData,
  onSuccess,
  onCancel,
}: AdminAnnouncementFormProps) {
  const isEditing = Boolean(initialData);

  // Form States
  const [category, setCategory] = useState(initialData?.category || "Notice");
  const [priority, setPriority] = useState(initialData?.priority || "Normal");
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);
  const [status, setStatus] = useState(initialData?.status || "Published");

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

  // Upload States
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Collapsible Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      initialData?.image_url ||
      initialData?.attachment_url ||
      (initialData?.target_audience && initialData.target_audience !== "All") ||
      (initialData?.property_id && initialData.property_id !== defaultPropertyId)
    )
  );

  // Handle Photo File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "announcements");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      setImageUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Attachment File Upload
  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "circulars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload circular attachment");
      }

      setAttachmentUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Failed to upload circular attachment");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Form submission via Server Action
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
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[22px]">
              {isEditing ? "edit_note" : "campaign"}
            </span>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
              {isEditing ? "Edit Announcement" : "Create New Announcement"}
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Broadcast circulars, maintenance advisories, and emergency alerts to residents
            </p>
          </div>
        </div>

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

      {state?.error && (
        <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{state.error}</span>
        </div>
      )}

      {uploadError && (
        <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">cloud_off</span>
          <span>{uploadError}</span>
        </div>
      )}

      <form action={formAction} className="mt-5 space-y-4">
        {/* ROW 1: CATEGORY & PRIORITY WITH DESCRIPTIVE SUBTITLES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* CATEGORY DROPDOWN */}
          <div className="space-y-1 sm:col-span-1">
            <label htmlFor="category" className="text-xs font-bold text-white flex items-center gap-1">
              <span>Notice Category</span>
              <span className="text-rose-400">*</span>
            </label>
            <p className="text-[10px] text-on-surface-variant leading-tight">
              Classification for filtering & resident feed
            </p>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* PRIORITY SELECTOR */}
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <span>Urgency & Priority</span>
            </label>
            <p className="text-[10px] text-on-surface-variant leading-tight">
              Urgent triggers a prominent alert banner
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(["Normal", "High", "Urgent"] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center pressable ${
                      isSelected
                        ? p === "Urgent"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm"
                          : p === "High"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                          : "bg-primary/20 text-primary border-primary/50 shadow-sm"
                        : "bg-surface-container-lowest border-outline-variant/50 text-on-surface-variant hover:text-white"
                    }`}
                  >
                    {p === "Urgent" ? "🚨 Urgent" : p === "High" ? "⚠️ High" : "Normal"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STATUS & PIN ROW */}
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-white flex items-center gap-1">
              <span>Status & Pin</span>
            </label>
            <p className="text-[10px] text-on-surface-variant leading-tight">
              Control visibility & pin to feed header
            </p>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="Published">🟢 Published</option>
                <option value="Draft">📝 Draft</option>
                <option value="Archived">📦 Archived</option>
              </select>

              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 pressable ${
                  isPinned
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/50 hover:text-white"
                }`}
                title="Pin announcement to top of feed"
              >
                <span className="material-symbols-outlined text-[15px] text-amber-400">push_pin</span>
                <span>{isPinned ? "Pinned" : "Pin"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* FIELD 2: TITLE WITH SUBTITLE */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-baseline">
            <label htmlFor="title" className="text-xs font-bold text-white flex items-center gap-1">
              <span>Announcement Title</span>
              <span className="text-rose-400">*</span>
            </label>
          </div>
          <p className="text-[10px] text-on-surface-variant leading-tight">
            A concise, descriptive headline displayed on cards and emergency notifications
          </p>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={initialData?.title || ""}
            required
            placeholder="e.g. Scheduled Water Supply Disruption — Level 1 to 20"
            className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl px-4 py-2.5 text-sm sm:text-base font-bold text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* FIELD 3: CONTENT BODY WITH SUBTITLE */}
        <div className="space-y-1">
          <label htmlFor="content" className="text-xs font-bold text-white flex items-center gap-1">
            <span>Announcement Body & Details</span>
            <span className="text-rose-400">*</span>
          </label>
          <p className="text-[10px] text-on-surface-variant leading-tight">
            Comprehensive description, affected units/zones, emergency contacts, and actionable advice
          </p>
          <textarea
            id="content"
            name="content"
            rows={5}
            defaultValue={initialData?.content || ""}
            required
            placeholder="Provide complete circular details, affected areas, dates, times, alternative arrangements, and contact person..."
            className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl px-4 py-3 text-xs sm:text-sm text-gray-200 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y leading-relaxed font-sans"
          />
        </div>

        {/* FIELD 4: COVER IMAGE UPLOADER & URL */}
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">image</span>
                <span>Cover Photo (Manual Upload or URL)</span>
              </label>
              <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                Upload a photo directly from your device (auto-linked to cloud storage) or paste a web URL
              </p>
            </div>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5 transition-colors pressable"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isUploadingImage ? "sync" : "cloud_upload"}
              </span>
              <span>{isUploadingImage ? "Uploading..." : "Upload Photo"}</span>
            </button>

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Image Preview & URL input */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            {imageUrl ? (
              <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-outline-variant/60 shrink-0 bg-surface-container group">
                <Image
                  src={imageUrl}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-300 transition-opacity"
                  title="Remove image"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ) : null}

            <div className="w-full relative flex-1">
              <input
                type="url"
                id="image_url"
                name="image_url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... or click 'Upload Photo' to choose local file"
                className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary font-mono text-[11px]"
              />
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white"
                  title="Clear URL"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* EXPANDABLE SECTION: AUDIENCE, DATES & DOCUMENT ATTACHMENT */}
        <div className="border border-outline-variant/40 rounded-2xl bg-surface-container-lowest/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-on-surface-variant hover:text-white transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] text-primary">tune</span>
              <span className="font-semibold text-white">Target Scope, Validity Dates & Attachment</span>
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
              {/* Target Property & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white block">
                    Target Property Scope
                  </label>
                  <p className="text-[10px] text-on-surface-variant leading-tight">
                    Broadcast across all properties or restrict to one
                  </p>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">🌐 Broadcast to All Managed Properties</option>
                    {properties.map((p) => (
                      <option key={p.property_id} value={p.property_id}>
                        🏢 {p.property_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white block">
                    Target Resident Audience
                  </label>
                  <p className="text-[10px] text-on-surface-variant leading-tight">
                    Specify which resident group can view this circular
                  </p>
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

              {/* Validity Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white block">
                    Publish Date
                  </label>
                  <p className="text-[10px] text-on-surface-variant leading-tight">
                    When this circular becomes live on noticeboards
                  </p>
                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white block">
                    Expiry Date
                  </label>
                  <p className="text-[10px] text-on-surface-variant leading-tight">
                    When this notice will automatically archive
                  </p>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Attachment PDF Document */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">picture_as_pdf</span>
                      <span>Official PDF Circular Document (Optional)</span>
                    </label>
                    <p className="text-[10px] text-on-surface-variant leading-tight">
                      Upload a PDF circular for residents to download
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-white text-xs font-semibold flex items-center gap-1.5 transition-colors pressable"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isUploadingAttachment ? "sync" : "attach_file"}
                    </span>
                    <span>{isUploadingAttachment ? "Uploading..." : "Upload File"}</span>
                  </button>

                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                </div>

                <input
                  type="url"
                  id="attachment_url"
                  name="attachment_url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://.../official_notice.pdf"
                  className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary font-mono text-[11px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
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
            disabled={isPending || isUploadingImage || isUploadingAttachment}
            className="btn-primary px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-lg pressable disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isPending ? "sync" : "send"}
            </span>
            <span>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Publish Announcement"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
