import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { FILE_TOO_LARGE_MESSAGE } from "@/lib/upload-limit";
import { IMAGE_TYPES, UPLOAD_HARD_LIMIT_BYTES, storeFile } from "@/lib/storage/files";
import { getStorageFolder } from "@/lib/storage/folders";
import { ownerTag } from "@/lib/ticket-photos";

/**
 * Upload one helpdesk photo (DEV-187). Residents and admins. Returns the
 * stored path only - the photo is attached when the ticket is submitted, and
 * is served by /api/tickets/attachments/[id] to the reporter and admins.
 * Never through /api/files: the tickets folder is not one it serves.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "Resident" && user.role !== "Admin")) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > UPLOAD_HARD_LIMIT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: FILE_TOO_LARGE_MESSAGE }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload. Please try again." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No photo attached." }, { status: 400 });

  try {
    const stored = await storeFile({
      folder: await getStorageFolder("ticket_attachment"),
      bytes: new Uint8Array(await file.arrayBuffer()),
      allowed: IMAGE_TYPES,
      // Owner tag first: the ticket action only accepts photos carrying the submitter's tag.
      label: `${ownerTag(user.userId)} ${file.name}`,
    });
    return NextResponse.json({ path: stored.path, name: file.name, size: stored.size, mime: stored.mime });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: message.includes("isn't set up") ? 503 : 400 });
  }
}
