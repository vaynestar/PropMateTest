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

/**
 * Admin uploads for announcements: a cover photo ("announcements") or a
 * circular document ("circulars").
 *
 * This wrote to public/uploads on the server's disk. Vercel's filesystem does
 * not persist, so every uploaded image would have disappeared on the next
 * deploy - nothing was ever actually kept. Files now go to Firebase Storage
 * (private bucket) and are served by /api/files/... to logged-in users.
 */

const RULES = {
  announcements: IMAGE_TYPES,
  circulars: IMAGE_OR_PDF,
} as const;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  if (Number(req.headers.get("content-length") ?? 0) > UPLOAD_HARD_LIMIT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "That file is over 4 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload. Please try again." }, { status: 400 });
  }

  const folder = String(form.get("folder") || "announcements");
  if (folder !== "announcements" && folder !== "circulars") {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // The Settings limit applies, but never above what Vercel will accept.
  const setting = await prisma.appParameter.findUnique({ where: { param_key: "STORAGE_MAX_UPLOAD_MB" } });
  const settingBytes = (parseInt(setting?.param_value || "4", 10) || 4) * 1024 * 1024;

  try {
    const stored = await storeFile({
      folder,
      bytes: new Uint8Array(await file.arrayBuffer()),
      allowed: [...RULES[folder]],
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
