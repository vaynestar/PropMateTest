import "server-only";
import { randomUUID } from "node:crypto";
import { deleteObject, firebaseStorageConfigured, putObject } from "./firebase";
import { folderProblem } from "./folders";

/**
 * Uploaded files: one set of rules for every upload in PropMate.
 *
 * - Type is decided by the file's bytes, never its name or the browser's MIME
 *   type, which are text the uploader chose. An HTML or SVG file renamed .png
 *   would otherwise be served back into someone's browser.
 * - Stored under a random name inside the folder the storage masterfile gives
 *   for that kind of upload (lib/storage/folders.ts).
 * - At most 4 MB: Vercel rejects request bodies over 4.5 MB.
 */

export const UPLOAD_HARD_LIMIT_BYTES = 4 * 1024 * 1024;

export type SniffedType = "image/jpeg" | "image/png" | "application/pdf";

const EXT: Record<SniffedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** Photos: JPG / JPEG / PNG only (user, 2026-09-16). */
export const IMAGE_TYPES: SniffedType[] = ["image/jpeg", "image/png"];
export const IMAGE_OR_PDF: SniffedType[] = [...IMAGE_TYPES, "application/pdf"];

export function typeMessage(allowed: SniffedType[]) {
  return allowed.includes("application/pdf")
    ? "Please upload a JPG, JPEG, PNG or PDF file only."
    : "Please upload a JPG, JPEG or PNG image only.";
}

export function sniffFileType(bytes: Uint8Array): SniffedType | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (bytes.length >= 5 && String.fromCharCode(b(0), b(1), b(2), b(3), b(4)) === "%PDF-") return "application/pdf";
  return null;
}

/** The last path segment of anything this app stores: uuid.ext */
export const OBJECT_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|pdf|webp)$/;

/** The PropMate URL for a stored announcement photo or attachment. */
export const publicFileUrl = (path: string) => `/api/files/${path}`;

export async function storeFile(input: {
  folder: string;
  bytes: Uint8Array;
  allowed: SniffedType[];
  maxBytes?: number;
}): Promise<{ path: string; mime: SniffedType; size: number }> {
  if (!firebaseStorageConfigured()) {
    throw new Error("File storage isn't set up on this server.");
  }
  if (folderProblem(input.folder)) throw new Error("The storage folder for this upload isn't valid.");

  const max = Math.min(input.maxBytes ?? UPLOAD_HARD_LIMIT_BYTES, UPLOAD_HARD_LIMIT_BYTES);
  if (input.bytes.length === 0) throw new Error("That file is empty.");
  if (input.bytes.length > max) {
    throw new Error(`That file is over ${Math.floor(max / 1024 / 1024)} MB. Please upload a smaller file.`);
  }
  const mime = sniffFileType(input.bytes);
  if (!mime || !input.allowed.includes(mime)) throw new Error(typeMessage(input.allowed));

  const path = `${input.folder}/${randomUUID()}.${EXT[mime]}`;
  await putObject(path, input.bytes, mime);
  return { path, mime, size: input.bytes.length };
}

export async function removeFile(path: string | null | undefined) {
  if (path) await deleteObject(path);
}
