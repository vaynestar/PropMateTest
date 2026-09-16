import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  IMAGE_OR_PDF,
  IMAGE_TYPES,
  UPLOAD_HARD_LIMIT_BYTES,
  publicFileUrl,
  storeFile,
} from "@/lib/storage/files";
import { getStorageFolder, type StoragePurpose } from "@/lib/storage/folders";

/**
 * Admin uploads for announcements: a photo or an attachment (circular).
 *
 * Files go to Firebase Storage (private bucket) in the folder the storage
 * masterfile gives for that kind of upload, and are served by /api/files/...
 * The form still sends folder=announcements|circulars; those are read as the
 * kind of upload, not as a path.
 */

const PURPOSE: Record<string, { purpose: StoragePurpose; allowed: typeof IMAGE_TYPES }> = {
  announcements: { purpose: "announcement_image", allowed: IMAGE_TYPES },
  circulars: { purpose: "announcement_attachment", allowed: IMAGE_OR_PDF },
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  if (Number(req.headers.get("content-length") ?? 0) > UPLOAD_HARD_LIMIT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "That file is over 4 MB. Please upload a smaller file." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload. Please try again." }, { status: 400 });
  }

  const kind = PURPOSE[String(form.get("folder") || "announcements")];
  if (!kind) return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const setting = await prisma.appParameter.findUnique({ where: { param_key: "STORAGE_MAX_UPLOAD_MB" } });
  const settingBytes = (parseInt(setting?.param_value || "4", 10) || 4) * 1024 * 1024;

  try {
    const stored = await storeFile({
      folder: await getStorageFolder(kind.purpose),
      bytes: new Uint8Array(await file.arrayBuffer()),
      allowed: kind.allowed,
      maxBytes: Math.min(settingBytes, UPLOAD_HARD_LIMIT_BYTES),
    });
    return NextResponse.json({
      success: true,
      url: publicFileUrl(stored.path),
      fileName: file.name,
      fileSize: stored.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message.includes("isn't set up") ? 503 : 400;
    if (status === 503) console.error("Upload: Firebase Storage not configured");
    return NextResponse.json({ error: message }, { status });
  }
}
