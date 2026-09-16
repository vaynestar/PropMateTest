/**
 * Names and links for stored files. No server-only imports, so the
 * announcement actions and the file route can share one definition.
 *
 * Object names are readable in the Firebase console (user, 2026-09-16:
 * *"all image and code since UUID, abit hard to manage in firebase"*):
 *
 *   <folder>/<yyyy-mm>/<yyyymmdd-hhmmss>-<what-it-is>-<6 hex>.<ext>
 *   announcements/2026-09/20260916-143210-water-supply-interruption-3f9a1c.jpg
 *
 * Month sub-folders keep a folder from turning into one endless list; the
 * timestamp sorts files by upload time; the short random tail stops two
 * uploads in the same second colliding. Names are no longer secret, which is
 * fine: access is decided by what references a file, never by its name.
 * Files uploaded before DEV-178 keep their uuid names.
 */
export const OBJECT_NAME =
  /^(\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{6}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|pdf|webp)$/;

export const PATH_SEGMENT = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/** Folder parts (1-3 from the masterfile, plus the month) and a file name. */
export function isStoredPath(path: string) {
  const parts = path.split("/");
  if (parts.length < 2 || parts.length > 5) return false;
  return OBJECT_NAME.test(parts[parts.length - 1]) && parts.slice(0, -1).every((s) => PATH_SEGMENT.test(s));
}

/** "Water Supply – Block A (Final).JPG" -> "water-supply-block-a-final" */
export function slugForFile(label: string | null | undefined) {
  const slug = (label ?? "")
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= 40) return slug || "file";
  // Cut at a word break so names don't end mid-word ("gatherin").
  const cut = slug.slice(0, 41);
  const lastBreak = cut.lastIndexOf("-");
  return (lastBreak > 15 ? cut.slice(0, lastBreak) : slug.slice(0, 40)).replace(/-+$/g, "");
}

/**
 * What an announcement's photo or attachment link may be: a file uploaded to
 * PropMate (/api/files/...) or an ordinary web link. Anything else is refused.
 *
 * The attachment is rendered as <a href>, so an unchecked value like
 * "javascript:..." would run in the browser of whoever clicked it.
 */
export function checkAnnouncementLink(value: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  const v = (value ?? "").trim();
  if (!v) return { ok: true, value: null };
  if (v.startsWith("/api/files/")) {
    return isStoredPath(v.slice("/api/files/".length)) ? { ok: true, value: v } : { ok: false };
  }
  try {
    const url = new URL(v);
    if (url.protocol === "https:" || url.protocol === "http:") return { ok: true, value: url.toString() };
  } catch {
    /* not a URL */
  }
  return { ok: false };
}
