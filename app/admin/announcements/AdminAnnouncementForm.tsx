"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { fitUploadLimit, optimizePhoto } from "@/lib/client/shrink-upload";
import { FILE_TOO_LARGE_MESSAGE } from "@/lib/upload-limit";
import Image from "next/image";
import CoverThumb, { DEFAULT_ANNOUNCEMENT_COVER } from "@/components/ui/CoverThumb";
import { createAnnouncement, updateAnnouncement } from "./actions";
import { todayISOMY } from "@/lib/short-date";

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
  /** Households with a running tenancy — the real audience (DEV-272). */
  households?: number;
  propertyName?: string | null;
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
  households = 0,
  propertyName = null,
}: AdminAnnouncementFormProps) {
  const isEditing = Boolean(initialData);

  // Controlled, so the preview can show what is actually being typed.
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "Notice");
  const [priority, setPriority] = useState(initialData?.priority || "Normal");
  const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);
  const [status, setStatus] = useState(initialData?.status || "Published");

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialData ? initialData.property_id || "ALL" : defaultPropertyId || "ALL"
  );
  /*
   * "Tenants only" / "Owners only" was saved to target_audience and read by
   * nothing - every notice reached every resident (R23/D-27). It cannot work
   * either: the owner/renter field was dropped in DEV-135, so the system has
   * no way to tell the two apart. The picker is gone; the column keeps "All".
   */
  const targetAudience = "All";

  const [publishDate, setPublishDate] = useState(
    initialData?.publish_date
      ? new Date(initialData.publish_date).toISOString().split("T")[0]
      : todayISOMY()
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
      (initialData?.property_id && initialData.property_id !== defaultPropertyId)
    )
  );

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // lets the same file be picked again after an error

    // Checked here for a fast answer; the server checks the file's contents again.
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadError("Please upload a JPG, JPEG or PNG image only.");
      return;
    }
    setIsUploadingImage(true);
    setUploadError(null);

    try {
      // Photos are resized for the screen (max 1600px) and anything over 4 MB is shrunk.
      const fitted = await optimizePhoto(file);
      if (!fitted) throw new Error(FILE_TOO_LARGE_MESSAGE);

      const formData = new FormData();
      formData.append("file", fitted.file);
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
    e.target.value = "";

    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setUploadError("Please upload a PDF, JPG, JPEG or PNG file only.");
      return;
    }
    setIsUploadingAttachment(true);
    setUploadError(null);

    try {
      const fitted = await fitUploadLimit(file);
      if (!fitted) throw new Error(FILE_TOO_LARGE_MESSAGE);

      const formData = new FormData();
      formData.append("file", fitted.file);
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

      {/* Who is actually going to read this. */}
      {!isEditing && households > 0 && (
        <p className="mt-3 text-xs text-on-surface-variant">
          Everyone in {propertyName ?? "this property"} will see this — {households} household
          {households === 1 ? "" : "s"}.
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <form action={formAction} className="min-w-0 space-y-3.5">
        {/* Controls row: Category, Priority, Pin */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
            {/*
              Three words with no consequence attached told nobody anything.
              Each option now says what it DOES to the resident's screen,
              which is the only difference between them (DEV-272).
            */}
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { p: "Normal", what: "In the list" },
                { p: "High", what: "Near the top" },
                { p: "Urgent", what: "A banner on their home screen" },
              ] as const).map(({ p, what }) => {
                const isSelected = priority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`rounded-xl border px-2.5 py-2 text-left transition-all ${
                      isSelected
                        ? p === "Urgent"
                          ? "border-rose-500/50 bg-rose-500/15 text-rose-200"
                          : p === "High"
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                          : "border-primary/50 bg-primary/15 text-primary"
                        : "border-outline-variant/40 bg-surface-container text-on-surface-variant hover:text-white"
                    }`}
                  >
                    <span className="block text-xs font-bold">{p}</span>
                    <span className="mt-0.5 block text-[10.5px] leading-tight opacity-80">{what}</span>
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. No water, 9 AM to 4 PM on Tuesday"
            className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2 text-sm font-semibold text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
          />
          {/* A constraint the label cannot carry (Rule 3). */}
          <p className="mt-1 text-[11px] text-on-surface-variant/70">
            Say the effect, not the activity. &ldquo;No water&rdquo; is what a resident needs;
            &ldquo;tank cleaning&rdquo; is why.
          </p>
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
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Notice details, affected areas, dates, or contact information..."
            className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-200 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary resize-y leading-relaxed font-sans"
          />
        </div>

        {/* Cover Photo */}
        <div>
          <label className="text-[11px] font-medium text-on-surface-variant block">
            Photo
          </label>
          <p className="text-[11px] text-on-surface-variant/70 mb-1.5">
            Leave it blank and the notice uses the default cover shown here.
          </p>
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
            ) : (
              /* The default, shown rather than an empty slot, so the admin can
                 see what the notice board will actually carry (DEV-255). */
              <CoverThumb
                src={null}
                alt=""
                fallback={DEFAULT_ANNOUNCEMENT_COVER}
                sizes="80px"
                className="h-10 w-16 shrink-0 rounded-lg border border-outline-variant"
              />
            )}

            <input
              type="text"
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
              accept="image/jpeg,image/png"
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
                    type="text"
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
                    accept="application/pdf,image/jpeg,image/png"
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
              {isPending
                ? "Saving…"
                : isEditing
                ? "Save changes"
                : households > 0
                ? `Post it to ${households} household${households === 1 ? "" : "s"}`
                : "Post it"}
            </span>
          </button>
        </div>

        {/* The one thing the old form never said. */}
        {!isEditing && (
          <p className="pt-1 text-[11px] leading-relaxed text-on-surface-variant">
            Posting is immediate. There is no recall — taking it down later does not unsee it.
          </p>
        )}
        </form>

        {/*
          Not decoration (DEV-272). This is the only place an admin can see
          what they wrote the way a resident reads it, at the width they read
          it on. A notice is written in a wide dark form and read on a phone,
          and nothing in PropMate had ever shown the second one.
        */}
        <aside className="min-w-0">
          <p className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-on-surface-variant/70">
            On a resident&rsquo;s phone
          </p>
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {isPinned && (
                <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-primary">
                  <span className="material-symbols-outlined text-[11px] leading-none">push_pin</span>
                  Pinned
                </span>
              )}
              <span
                className={`rounded-md border px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide ${
                  priority === "Urgent"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : priority === "High"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-outline-variant bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {category}
              </span>
            </div>

            <h3 className="mt-2.5 text-sm font-bold leading-snug text-on-surface">
              {title || <span className="text-on-surface-variant/40">Your headline goes here</span>}
            </h3>
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-on-surface-variant">
              {content || "The notice itself goes here — what is happening, where, and when."}
            </p>
            <p className="mt-2.5 text-[10.5px] text-on-surface-variant/60">
              Management office · today
            </p>
          </div>

          {/* One honest reading check, from the text itself. */}
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-on-surface-variant">
            <span className="material-symbols-outlined mt-px shrink-0 text-[14px] text-emerald-300">
              check
            </span>
            {content.trim()
              ? `About ${Math.max(1, Math.round(content.trim().split(/\s+/).length / 3.5))} seconds to read.`
              : "Nothing written yet."}
          </p>
        </aside>
      </div>
    </div>
  );
}
