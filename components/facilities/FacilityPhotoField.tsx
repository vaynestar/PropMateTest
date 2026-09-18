"use client";

import { useRef, useState } from "react";
import { optimizePhoto } from "@/lib/client/shrink-upload";
import { FILE_TOO_LARGE_MESSAGE } from "@/lib/upload-limit";

/**
 * Facility photo picker for the admin add/edit forms (DEV-184). Uploads to
 * Firebase through /api/upload (folder "facilities"), compressing anything
 * over 4 MB first, and submits the resulting link as `image_url`.
 * Clearing it saves the facility with no photo.
 */
export default function FacilityPhotoField({ defaultValue }: { defaultValue?: string | null }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Please upload a JPG, JPEG or PNG image only.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fitted = await optimizePhoto(file);
      if (!fitted) throw new Error(FILE_TOO_LARGE_MESSAGE);
      const form = new FormData();
      form.append("file", fitted.file);
      form.append("folder", "facilities");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Upload failed. Please try again.");
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5 md:col-span-2">
      <span className="text-[11px] font-bold text-on-surface-variant">Photo (shown to residents)</span>
      <input type="hidden" name="image_url" value={url} />
      <div className="flex items-center gap-3">
        <div className="w-28 aspect-[4/3] shrink-0 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-high flex items-center justify-center">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Facility photo" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant/60 text-[28px]">add_photo_alternate</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/25 transition-colors disabled:opacity-60 flex items-center gap-1.5 pressable"
          >
            <span className="material-symbols-outlined text-[16px]">{busy ? "progress_activity" : "upload"}</span>
            {busy ? "Uploading…" : url ? "Change photo" : "Upload photo"}
          </button>
          {url && !busy && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="px-3 py-1.5 rounded-lg text-rose-300 border border-rose-500/30 bg-rose-500/10 text-xs font-semibold hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Remove
            </button>
          )}
          <span className="text-[10px] text-on-surface-variant">JPG or PNG. Large photos are compressed automatically.</span>
        </div>
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={onPick} className="hidden" />
    </div>
  );
}
