import { UPLOAD_LIMIT_BYTES } from "@/lib/upload-limit";

/**
 * Auto-shrink before upload (user, 2026-09-17: "if exceed it will try to shrink
 * below 4mb"). Runs in the browser because the server never sees an oversized
 * file - Vercel turns it away at the door.
 *
 * - Under the limit: returned untouched.
 * - JPG/PNG over the limit: redrawn as JPEG, stepping down quality and then
 *   size until it fits. A phone photo usually lands well under 1 MB.
 * - PDF (or an image that still won't fit): null - the caller shows
 *   FILE_TOO_LARGE_MESSAGE. PDFs can't be recompressed reliably in a browser.
 */
export async function fitUploadLimit(
  file: File,
  maxBytes = UPLOAD_LIMIT_BYTES
): Promise<{ file: File; shrunk: boolean } | null> {
  if (file.size <= maxBytes) return { file, shrunk: false };
  if (file.type !== "image/jpeg" && file.type !== "image/png") return null;

  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    const longest = Math.max(source.width, source.height);
    let scale = Math.min(1, 2560 / longest); // nobody needs more than 2560px on a notice or receipt
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    for (let round = 0; round < 6; round++) {
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      // JPEG has no transparency - paint white first so PNG screenshots don't turn black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.72, 0.6]) {
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
        if (blob && blob.size <= maxBytes) {
          const name = file.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
          return { file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }), shrunk: true };
        }
      }
      scale *= 0.75;
    }
    return null;
  } finally {
    source.close();
  }
}

export const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Photos shown on screen (announcements, facilities, helpdesk) don't need a
 * 12-megapixel original: anything wider than `maxDim` or heavier than 1.5 MB
 * is redrawn as a JPEG at most `maxDim` px on the long side (DEV-187, user:
 * "all picture seem slow to load"). Smaller files load faster for everyone who
 * views them later. Falls back to fitUploadLimit's rules if the browser can't
 * decode the image.
 */
export async function optimizePhoto(
  file: File,
  maxDim = 1600
): Promise<{ file: File; shrunk: boolean } | null> {
  if (file.type !== "image/jpeg" && file.type !== "image/png") return fitUploadLimit(file);
  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return fitUploadLimit(file);
  }
  try {
    const longest = Math.max(source.width, source.height);
    if (longest <= maxDim && file.size <= 1.5 * 1024 * 1024) return { file, shrunk: false };
    const scale = Math.min(1, maxDim / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return fitUploadLimit(file);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return fitUploadLimit(file);
    const name = file.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg";
    return fitUploadLimit(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() })).then((r) =>
      r ? { file: r.file, shrunk: true } : null
    );
  } finally {
    source.close();
  }
}
