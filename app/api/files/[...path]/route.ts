import { NextRequest, NextResponse } from "next/server";
import { fileSecurityHeaders } from "@/lib/file-headers";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isStoredPath } from "@/lib/storage/urls";
import { getStorageFolders } from "@/lib/storage/folders";
import { getObject } from "@/lib/storage/firebase";

/**
 * Announcement photos and attachments, and facility photos (DEV-184), from
 * the private Firebase bucket.
 *
 * Folder names are editable (storage masterfile), so they can't decide who may
 * read a file. Instead:
 *   - a file is served when an announcement or a facility actually uses it;
 *   - an admin may also open a file still sitting in the current announcement
 *     photo/attachment folders - that is the preview right after uploading,
 *     before the notice is saved;
 *   - anything in the payment-receipt folder is never served here. Receipts
 *     carry personal payment details and go through /api/payments/proof/[id],
 *     which checks who owns the invoice.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const user = await getSessionUser();
  const notFound = () => new NextResponse("Not found", { status: 404 });

  if (!user || !Array.isArray(parts)) return notFound();
  const path = parts.join("/");
  if (!isStoredPath(path)) return notFound();

  const url = `/api/files/${path}`;
  const configured = await getStorageFolders();
  const inFolder = (folder: string) => path.startsWith(folder + "/");

  if (inFolder(configured.payment_receipt) || inFolder(configured.ticket_attachment)) return notFound();

  const usedByAnnouncement = await prisma.announcement.findFirst({
    where: { OR: [{ image_url: url }, { attachment_url: url }] },
    select: { announcement_id: true },
  });
  const usedByFacility = usedByAnnouncement
    ? null
    : await prisma.facility.findFirst({ where: { image_url: url }, select: { facility_id: true } });
  const adminPreview =
    user.role === "Admin" &&
    (inFolder(configured.announcement_image) ||
      inFolder(configured.announcement_attachment) ||
      inFolder(configured.facility_image));

  if (!usedByAnnouncement && !usedByFacility && !adminPreview) return notFound();

  let file: Awaited<ReturnType<typeof getObject>>;
  try {
    file = await getObject(path);
  } catch (error) {
    console.error("File read failed", error instanceof Error ? error.message : error);
    return new NextResponse("Unavailable", { status: 503 });
  }
  if (!file) return notFound();

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      // Names are random and never reused, so the bytes behind a URL never change.
      "Cache-Control": "private, max-age=2592000, immutable",
      ...fileSecurityHeaders(String(file.contentType)),
    },
  });
}
