import prisma from "@/lib/prisma";
import { getStorageFolder } from "@/lib/storage/folders";
import { readTicketPhotos } from "@/lib/ticket-photos";

/**
 * Helpdesk conversation (DEV-189, FR-09 "monitor the progress and resolution
 * history"; user, 2026-09-18: "tap details should open a pop out window with
 * all previous comment as well and attachment if any"). One thread per ticket
 * in `ticket_comments`, each message may carry photos (`ticket_attachments`
 * with comment_id). Photos on the original report have no comment_id.
 */

export type ThreadPhoto = { id: string; name: string };
export type ThreadMessage = {
  id: string;
  author: string;
  fromOffice: boolean;
  mine: boolean;
  text: string;
  at: string; // "18 Sep 2026, 10:42 pm"
  photos: ThreadPhoto[];
};
export type TicketThread = {
  id: string;
  shortId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  remark: string | null;
  where: string;
  isCommonArea: boolean;
  reported: string;
  resolved: string | null;
  reporter: string | null;
  photos: ThreadPhoto[];
  messages: ThreadMessage[];
  closed: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "18 Sep 2026, 10:42 pm" in Malaysia time. */
export function myStamp(d: Date, withTime = true) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  const date = `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}`;
  if (!withTime) return date;
  const h = Number(p.hour);
  return `${date}, ${h % 12 || 12}:${p.minute} ${h >= 12 ? "pm" : "am"}`;
}

const CLOSED = new Set(["Resolved", "Closed"]);

/** The ticket and its thread, if `viewer` may see it (admin, reporter or lease tenant). */
export async function getTicketThread(
  ticketId: string,
  viewer: { userId: string; role: string }
): Promise<TicketThread | null> {
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return null;
  const t = await prisma.ticket.findUnique({
    where: { ticket_id: ticketId },
    select: {
      ticket_id: true,
      title: true,
      description: true,
      ticket_category: true,
      status: true,
      remark: true,
      location_type: true,
      location_detail: true,
      created_at: true,
      resolved_at: true,
      requester_id: true,
      reporter: { select: { user_name: true } },
      unit: { select: { unit_number: true } },
      lease: { select: { user_id: true, unit: { select: { unit_number: true } } } },
      attachments: {
        where: { comment_id: null },
        select: { attachment_id: true, file_name: true },
        orderBy: { created_at: "asc" },
      },
      comments: {
        orderBy: { created_at: "asc" },
        select: {
          comment_id: true,
          message_text: true,
          created_at: true,
          user_id: true,
          author: { select: { user_name: true, role: true } },
          attachments: { select: { attachment_id: true, file_name: true }, orderBy: { created_at: "asc" } },
        },
      },
    },
  });
  if (!t) return null;
  const allowed = viewer.role === "Admin" || t.requester_id === viewer.userId || t.lease?.user_id === viewer.userId;
  if (!allowed) return null;

  const isCommonArea = t.location_type === "Common Area";
  const unit = t.unit?.unit_number || t.lease?.unit?.unit_number;
  return {
    id: t.ticket_id,
    shortId: t.ticket_id.split("-")[0].toUpperCase(),
    title: t.title,
    description: t.description,
    category: t.ticket_category,
    status: t.status,
    remark: t.remark,
    where: isCommonArea ? t.location_detail || "Common area" : `Unit ${unit || "N/A"}`,
    isCommonArea,
    reported: myStamp(t.created_at),
    resolved: t.resolved_at ? myStamp(t.resolved_at, false) : null,
    reporter: t.reporter?.user_name ?? null,
    photos: t.attachments.map((a) => ({ id: a.attachment_id, name: a.file_name })),
    closed: CLOSED.has(t.status),
    messages: t.comments.map((c) => ({
      id: c.comment_id,
      author: c.author.role === "Admin" ? "Management office" : c.author.user_name,
      fromOffice: c.author.role === "Admin",
      mine: c.user_id === viewer.userId,
      text: c.message_text,
      at: myStamp(c.created_at),
      photos: c.attachments.map((a) => ({ id: a.attachment_id, name: a.file_name })),
    })),
  };
}

/** Add a message (and photos) to a ticket's thread. */
export async function addTicketMessage(input: {
  ticketId: string;
  viewer: { userId: string; role: string };
  text: string;
  attachments: FormDataEntryValue[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const thread = await getTicketThread(input.ticketId, input.viewer);
  if (!thread) return { ok: false, error: "That request no longer exists." };
  if (thread.closed && input.viewer.role !== "Admin") {
    return { ok: false, error: "This request is closed. Raise a new request if the problem is back." };
  }
  const text = input.text.trim();
  if (!text && input.attachments.length === 0) return { ok: false, error: "Write a message or add a photo." };
  if (text.length > 2000) return { ok: false, error: "Keep the message under 2,000 characters." };

  const photos = readTicketPhotos(input.attachments, await getStorageFolder("ticket_attachment"), input.viewer.userId);
  if (!photos.ok) return { ok: false, error: photos.error };

  await prisma.$transaction(async (tx) => {
    const c = await tx.ticketComment.create({
      data: {
        ticket_id: input.ticketId,
        user_id: input.viewer.userId,
        message_text: text || "(photo)",
        created_by: input.viewer.userId,
      },
    });
    if (photos.photos.length) {
      await tx.ticketAttachment.createMany({
        data: photos.photos.map((p) => ({
          ticket_id: input.ticketId,
          comment_id: c.comment_id,
          uploaded_by: input.viewer.userId,
          file_name: p.name,
          file_url: p.path,
          file_type: p.mime,
          file_size: p.size,
          created_by: input.viewer.userId,
        })),
      });
    }
  });
  return { ok: true };
}
