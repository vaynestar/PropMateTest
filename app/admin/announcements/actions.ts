"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function createAnnouncement(prevState: any, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || "Notice";
    const priority = (formData.get("priority") as string)?.trim() || "Normal";
    const status = (formData.get("status") as string)?.trim() || "Published";
    const target_audience = (formData.get("target_audience") as string)?.trim() || "All";
    const is_pinned = formData.get("is_pinned") === "true" || formData.get("is_pinned") === "on";

    const rawPropertyId = (formData.get("property_id") as string)?.trim();
    const property_id = rawPropertyId && rawPropertyId !== "ALL" && rawPropertyId !== "" ? rawPropertyId : null;

    const image_url = (formData.get("image_url") as string)?.trim() || null;
    const attachment_url = (formData.get("attachment_url") as string)?.trim() || null;

    const publish_date_raw = formData.get("publish_date") as string;
    const expiry_date_raw = formData.get("expiry_date") as string;

    if (!title || !content) {
      return { success: false, error: "Please provide both an announcement title and content body." };
    }

    const publish_date = publish_date_raw ? new Date(publish_date_raw) : new Date();
    
    // Default expiry date: 30 days from publish date if not specified
    let expiry_date: Date;
    if (expiry_date_raw) {
      expiry_date = new Date(expiry_date_raw);
    } else {
      expiry_date = new Date(publish_date);
      expiry_date.setDate(expiry_date.getDate() + 30);
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        category,
        priority,
        status,
        is_pinned,
        target_audience,
        property_id,
        image_url,
        attachment_url,
        publish_date,
        expiry_date,
        created_by: user.userId,
      },
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/resident/announcements");
    revalidatePath("/resident");
    return { success: true, announcement: newAnnouncement };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create announcement." };
  }
}

export async function updateAnnouncement(announcementId: string, formData: FormData) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || "Notice";
    const priority = (formData.get("priority") as string)?.trim() || "Normal";
    const status = (formData.get("status") as string)?.trim() || "Published";
    const target_audience = (formData.get("target_audience") as string)?.trim() || "All";
    const is_pinned = formData.get("is_pinned") === "true" || formData.get("is_pinned") === "on";

    const rawPropertyId = (formData.get("property_id") as string)?.trim();
    const property_id = rawPropertyId && rawPropertyId !== "ALL" && rawPropertyId !== "" ? rawPropertyId : null;

    const image_url = (formData.get("image_url") as string)?.trim() || null;
    const attachment_url = (formData.get("attachment_url") as string)?.trim() || null;

    const publish_date_raw = formData.get("publish_date") as string;
    const expiry_date_raw = formData.get("expiry_date") as string;

    if (!title || !content) {
      return { success: false, error: "Please provide both an announcement title and content body." };
    }

    const publish_date = publish_date_raw ? new Date(publish_date_raw) : new Date();
    let expiry_date: Date;
    if (expiry_date_raw) {
      expiry_date = new Date(expiry_date_raw);
    } else {
      expiry_date = new Date(publish_date);
      expiry_date.setDate(expiry_date.getDate() + 30);
    }

    const updated = await prisma.announcement.update({
      where: { announcement_id: announcementId },
      data: {
        title,
        content,
        category,
        priority,
        status,
        is_pinned,
        target_audience,
        property_id,
        image_url,
        attachment_url,
        publish_date,
        expiry_date,
        modified_by: user.userId,
      },
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/resident/announcements");
    revalidatePath("/resident");
    return { success: true, announcement: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update announcement." };
  }
}

export async function togglePinAnnouncement(announcementId: string, currentPinned: boolean) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const updated = await prisma.announcement.update({
      where: { announcement_id: announcementId },
      data: {
        is_pinned: !currentPinned,
        modified_by: user.userId,
      },
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/resident/announcements");
    revalidatePath("/resident");
    return { success: true, announcement: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to toggle pin status." };
  }
}

export async function updateAnnouncementStatus(announcementId: string, status: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const updated = await prisma.announcement.update({
      where: { announcement_id: announcementId },
      data: {
        status,
        modified_by: user.userId,
      },
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/resident/announcements");
    revalidatePath("/resident");
    return { success: true, announcement: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update status." };
  }
}

export async function deleteAnnouncement(announcementId: string) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Admin") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    await prisma.announcement.delete({
      where: { announcement_id: announcementId },
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/resident/announcements");
    revalidatePath("/resident");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete announcement." };
  }
}
