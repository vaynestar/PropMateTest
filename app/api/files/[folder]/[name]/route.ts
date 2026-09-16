import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { OBJECT_NAME } from "@/lib/storage/files";
import { getObject } from "@/lib/storage/firebase";

/**
 * Announcement images and circulars, from the private Firebase bucket.
 *
 * Any logged-in user may read these - notices are for the residents and the
 * office alike. Receipts are deliberately NOT served here: they carry personal
 * payment details and go through /api/payments/proof/[id], which checks who
 * owns the invoice.
 */
const PUBLIC_TO_USERS = new Set(["announcements", "circulars"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> }
) {
  const { folder, name } = await params;
  const user = await getSessionUser();
  if (!user || !PUBLIC_TO_USERS.has(folder) || !OBJECT_NAME.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let file: Awaited<ReturnType<typeof getObject>>;
  try {
    file = await getObject(`${folder}/${name}`);
  } catch (error) {
    console.error("File read failed", error instanceof Error ? error.message : error);
    return new NextResponse("Unavailable", { status: 503 });
  }
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      // Names are random and never reused, so the bytes behind a URL never change.
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  });
}
