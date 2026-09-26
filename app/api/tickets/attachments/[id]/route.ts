import { NextRequest, NextResponse } from "next/server";
import { fileSecurityHeaders } from "@/lib/file-headers";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getObject } from "@/lib/storage/firebase";
import { isUuid } from "@/lib/uuid";

/**
 * A helpdesk photo (DEV-187). Admins, or the resident who reported the ticket
 * (or the tenant on its lease). Anyone else gets 404 - same rule as receipts.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const notFound = () => new NextResponse("Not found", { status: 404 });
  if (!user || !isUuid(id)) return notFound();

  const a = await prisma.ticketAttachment.findUnique({
    where: { attachment_id: id },
    select: {
      file_url: true,
      file_type: true,
      ticket: { select: { requester_id: true, lease: { select: { user_id: true } } } },
    },
  });
  if (!a) return notFound();
  const allowed =
    user.role === "Admin" || a.ticket.requester_id === user.userId || a.ticket.lease?.user_id === user.userId;
  if (!allowed) return notFound();

  let file: Awaited<ReturnType<typeof getObject>>;
  try {
    file = await getObject(a.file_url);
  } catch {
    return new NextResponse("Unavailable", { status: 503 });
  }
  if (!file) return notFound();

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=2592000, immutable",
      ...fileSecurityHeaders(String(file.contentType)),
    },
  });
}
