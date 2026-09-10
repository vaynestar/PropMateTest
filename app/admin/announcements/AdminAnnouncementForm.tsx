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

const CATEGORIES = [
  { value: "Notice", label: "Notice" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Emergency", label: "Emergency" },
  { value: "Security", label: "Security" },
  { value: "Event", label: "Event" },
  { value: "Billing", label: "Billing" },
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

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const [showOptions, setShowOptions] = useState(
    Boolean(
      initialData?.image_url ||
      initialData?.attachment_url ||
      (initialData?.target_audience && initialData.target_audience !== "All") ||
      (initialData?.property_id && initialData.property_id !== defaultPropertyId)
    )
  );

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
        throw new Error(data.error || "Upload failed");
      }

      setImageUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

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
        throw new Error(data.error || "Upload failed");
      }

      setAttachmentUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

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
    <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-outline-variant/60 bg-[#10141f] p-4 text-white shadow-2xl sm:p-6">
      {/*
        The status control used to sit beside the title in a non-wrapping row.
        A <select> is as wide as its longest option, and these options carry
        their explanation ("Published — goes up on its publish date"), so on a
        phone it shoved the title aside and forced the whole panel to scroll
        sideways. The explanation now lives under the control, where it can wrap,
        and the header stacks below sm.
      */}
      <div className="border-b border-outline-variant/30 pb-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-base font-bold text-white">
            {isEditing ? "Edit announcement" : "New announcement"}
          </h2>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-1 sm:mt-2 sm:flex-row sm:items-center sm:gap-2">
          <label
            htmlFor="announcement-status"
            className="shrink-0 text-[11px] font-semibold text-on-surface-variant"
          >
            Save as
          </label>
          <select
            id="announcement-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full min-w-0 cursor-pointer rounded-lg border border-outline-variant/60 bg-surface-container px-2.5 py-2 text-xs text-white focus:border-primary focus:outline-none sm:w-auto"
          >
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
          <span className="text-[11px] leading-snug text-on-surface-variant sm:ml-1">
            {status === "Published"
              ? "Goes up on its publish date."
              : status === "Draft"
              ? "Not visible to residents."
              : "Taken off the board."}
          </span>
        </div>
      </div>

      {state?.error && (
        <div className="my-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {state.error}
        </div>
      )}

      {uploadError && (
        <div className="my-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {uploadError}
        </div>
      )}

      <form action={formAction} className="mt-4 space-y-3.5">
        {/* Controls row: Category, Priority, Pin */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
          {/* Category */}
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(["Normal", "High", "Urgent"] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? p === "Urgent"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                          : p === "High"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          : "bg-primary/20 text-primary border-primary/50"
                        : "bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pin */}
          <div className="sm:pt-5">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                isPinned
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                  : "bg-surface-container text-on-surface-variant border-outline-variant/50 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[15px] text-amber-400">push_pin</span>
              <span>{isPinned ? "Pinned to top" : "Pin notice"}</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="text-[11px] font-medium text-on-surface-variant block mb-1">
            Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={initialData?.title || ""}
            required
            placeholder="e.g. Water supply maintenance notice"
            className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Body content */}
        <div>
          <label htmlFor="content" className="text-[11px] font-medium text-on-surface-variant block mb-1">
            Details <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            defaultValue={initialData?.content || ""}
            required
            placeholder="Notice details, affected areas, dates, or contact information..."
            className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-200 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary resize-y leading-relaxed font-sans"
          />
        </div>

        {/* Cover Photo */}
        <div>
          <label className="text-[11px] font-medium text-on-surface-variant block mb-1">
            Photo (optional)
          </label>
          <div className="flex items-center gap-2">
            {imageUrl ? (
              <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-outline-variant shrink-0 bg-surface-container group">
                <Image
                  src={imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-300 transition-opacity"
                  title="Remove"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ) : null}

            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL or upload file..."
              className="flex-1 bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
            />

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-white font-medium flex items-center gap-1 shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">
                {isUploadingImage ? "sync" : "upload"}
              </span>
              <span>{isUploadingImage ? "Uploading..." : "Upload"}</span>
            </button>

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Options accordion (Scope, dates, PDF) */}
        <div className="border border-outline-variant/40 rounded-xl bg-surface-container/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-on-surface-variant hover:text-white transition-colors"
          >
            <span className="font-medium text-white">More options (dates, scope, PDF attachment)</span>
            <span className="material-symbols-outlined text-[18px]">
              {showOptions ? "expand_less" : "expand_more"}
            </span>
          </button>

          {showOptions && (
            <div className="p-3.5 pt-2 border-t border-outline-variant/30 space-y-3 text-xs">
              {/* Property & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-on-surface-variant block mb-1">
                    Property
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All properties</option>
                    {properties.map((p) => (
                      <option key={p.property_id} value={p.property_id}>
                        {p.property_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-on-surface-variant block mb-1">
                    Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="All">All residents</option>
                    <option value="Tenants">Tenants only</option>
                    <option value="Owners">Owners only</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-on-surface-variant block mb-1">
                    Publish date
                  </label>
                  <input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-on-surface-variant block mb-1">
                    Expiry date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Attachment PDF */}
              <div>
                <label className="text-[11px] text-on-surface-variant block mb-1">
                  PDF attachment (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="PDF link or upload file..."
                    className="flex-1 bg-surface-container border border-outline-variant/50 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                  />

                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-white font-medium flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isUploadingAttachment ? "sync" : "attach_file"}
                    </span>
                    <span>{isUploadingAttachment ? "Uploading..." : "Upload PDF"}</span>
                  </button>

                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/30">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant hover:bg-surface-container-high text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isPending || isUploadingImage || isUploadingAttachment}
            className="btn-primary px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPending ? "sync" : "check"}
            </span>
            <span>
              {isPending ? "Saving..." : isEditing ? "Save changes" : "Publish"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
