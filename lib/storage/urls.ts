/**
 * What an announcement's photo or attachment link may be: a file uploaded to
 * PropMate (/api/files/...) or an ordinary web link. Anything else is refused.
 *
 * The attachment is rendered as <a href>, so an unchecked value like
 * "javascript:..." would run in the browser of whoever clicked it.
 */
const UPLOADED = /^\/api\/files\/[a-z0-9][a-z0-9_\/-]*\/[0-9a-f-]{36}\.(jpg|png|pdf|webp)$/;

export function checkAnnouncementLink(value: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  const v = (value ?? "").trim();
  if (!v) return { ok: true, value: null };
  if (UPLOADED.test(v) && !v.includes("..")) return { ok: true, value: v };
  try {
    const url = new URL(v);
    if (url.protocol === "https:" || url.protocol === "http:") return { ok: true, value: url.toString() };
  } catch {
    /* not a URL */
  }
  return { ok: false };
}
