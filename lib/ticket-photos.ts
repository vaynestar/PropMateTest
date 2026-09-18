import { isStoredPath } from "@/lib/storage/urls";

/**
 * Helpdesk photos (DEV-187, FR-07; user, 2026-09-18: "Submit helpdesk request
 * cannot upload pic"). Shared by the upload route, the raise-ticket action and
 * the forms. No server-only imports.
 */
export const MAX_TICKET_PHOTOS = 3;

export type TicketPhoto = { path: string; name: string; size: number; mime: string };

/**
 * The uploader's id prefix is written into each object name at upload time
 * (…-<first 8 of user id>-<name>-<hex>.jpg), so a ticket can only claim photos
 * the same person uploaded.
 */
export function ownerTag(userId: string) {
  return userId.replace(/-/g, "").slice(0, 8).toLowerCase();
}

/** Parse and check the hidden `attachment` fields a form posted. */
export function readTicketPhotos(
  raw: FormDataEntryValue[],
  folder: string,
  userId: string
): { ok: true; photos: TicketPhoto[] } | { ok: false; error: string } {
  if (raw.length > MAX_TICKET_PHOTOS) return { ok: false, error: `Attach up to ${MAX_TICKET_PHOTOS} photos.` };
  const tag = ownerTag(userId);
  const photos: TicketPhoto[] = [];
  for (const entry of raw) {
    let p: TicketPhoto;
    try {
      p = JSON.parse(String(entry));
    } catch {
      return { ok: false, error: "A photo didn't upload properly. Remove it and add it again." };
    }
    const file = String(p.path || "").split("/").pop() || "";
    if (
      !isStoredPath(String(p.path || "")) ||
      !String(p.path).startsWith(folder + "/") ||
      !new RegExp(`^\\d{8}-\\d{6}-${tag}-`).test(file) ||
      !["image/jpeg", "image/png"].includes(p.mime)
    ) {
      return { ok: false, error: "A photo didn't upload properly. Remove it and add it again." };
    }
    photos.push({
      path: String(p.path),
      name: String(p.name || "photo.jpg").slice(0, 120),
      size: Math.max(0, Math.floor(Number(p.size) || 0)),
      mime: p.mime,
    });
  }
  return { ok: true, photos };
}
