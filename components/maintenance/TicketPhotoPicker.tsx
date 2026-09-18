"use client";

import { useRef, useState } from "react";
import { optimizePhoto } from "@/lib/client/shrink-upload";
import { FILE_TOO_LARGE_MESSAGE } from "@/lib/upload-limit";
import { MAX_TICKET_PHOTOS, type TicketPhoto } from "@/lib/ticket-photos";

type Item = TicketPhoto & { preview: string };

/**
 * Up to three photos on a helpdesk request (DEV-187, FR-07). Each is resized
 * on the phone, uploaded straight away to /api/tickets/photos, previewed from
 * the local file, and posted with the form as a hidden `attachment` field.
 */
export default function TicketPhotoPicker({
  onBusyChange,
  resetKey,
}: {
  onBusyChange?: (busy: boolean) => void;
  resetKey?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastReset, setLastReset] = useState(resetKey);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleared after a successful submit.
  if (resetKey !== lastReset) {
    items.forEach((i) => URL.revokeObjectURL(i.preview));
    setItems([]);
    setError(null);
    setLastReset(resetKey);
  }

  const setBusyCount = (fn: (n: number) => number) =>
    setBusy((n) => {
      const next = fn(n);
      onBusyChange?.(next > 0);
      return next;
    });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    const room = MAX_TICKET_PHOTOS - items.length - busy;
    if (files.length > room) setError(`You can attach up to ${MAX_TICKET_PHOTOS} photos.`);

    for (const file of files.slice(0, Math.max(0, room))) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setError("Please upload a JPG, JPEG or PNG image only.");
        continue;
      }
      setBusyCount((n) => n + 1);
      try {
        const fitted = await optimizePhoto(file, 1600);
        if (!fitted) throw new Error(FILE_TOO_LARGE_MESSAGE);
        const form = new FormData();
        form.append("file", fitted.file);
        const res = await fetch("/api/tickets/photos", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.path) throw new Error(data.error || "Upload failed. Please try again.");
        setItems((prev) => [...prev, { ...data, preview: URL.createObjectURL(fitted.file) }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setBusyCount((n) => n - 1);
      }
    }
  };

  const remove = (path: string) =>
    setItems((prev) => {
      const gone = prev.find((i) => i.path === path);
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((i) => i.path !== path);
    });

  const canAdd = items.length + busy < MAX_TICKET_PHOTOS;

  return (
    <div className="space-y-1.5 md:col-span-2">
      <label className="text-xs font-medium text-on-surface-variant flex items-center justify-between">
        <span>Photos (optional)</span>
        <span className="text-[11px]">{items.length}/{MAX_TICKET_PHOTOS}</span>
      </label>
      {items.map((i) => (
        <input key={i.path} type="hidden" name="attachment" value={JSON.stringify({ path: i.path, name: i.name, size: i.size, mime: i.mime })} />
      ))}
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <div key={i.path} className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.preview} alt={i.name} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i.path)}
              aria-label={`Remove ${i.name}`}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, n) => (
          <div key={`busy-${n}`} className="w-20 h-20 rounded-lg border border-outline-variant/60 bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-lg border border-dashed border-primary/50 bg-primary/5 text-primary flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold hover:bg-primary/10 pressable"
          >
            <span className="material-symbols-outlined text-[22px]">add_a_photo</span>
            Add
          </button>
        )}
      </div>
      <p className="text-[11px] text-on-surface-variant">JPG or PNG. Photos are resized automatically.</p>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" multiple onChange={onPick} className="hidden" />
    </div>
  );
}
