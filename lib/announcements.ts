import prisma from "@/lib/prisma";

export type AnnouncementFilters = {
  propertyId?: string;
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
};

export async function getAllAnnouncements(filters?: AnnouncementFilters) {
  const where: any = {};

  if (filters?.propertyId) {
    where.OR = [
      { property_id: filters.propertyId },
      { property_id: null },
    ];
  }

  if (filters?.category && filters.category !== "ALL") {
    where.category = filters.category;
  }

  if (filters?.priority && filters.priority !== "ALL") {
    where.priority = filters.priority;
  }

  if (filters?.status && filters.status !== "ALL") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filters.status === "Active") {
      where.status = "Published";
      where.expiry_date = { gte: today };
    } else if (filters.status === "Expired") {
      where.status = "Published";
      where.expiry_date = { lt: today };
    } else {
      where.status = filters.status;
    }
  }

  if (filters?.search) {
    const s = filters.search.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { title: { contains: s, mode: "insensitive" } },
          { content: { contains: s, mode: "insensitive" } },
          { category: { contains: s, mode: "insensitive" } },
        ],
      },
    ];
  }

  return prisma.announcement.findMany({
    where,
    include: {
      property: { select: { property_id: true, property_name: true, city: true } },
      author: { select: { user_id: true, user_name: true, user_email: true, role: true } },
    },
    orderBy: [
      { is_pinned: "desc" },
      { publish_date: "desc" },
      { created_at: "desc" },
    ],
  });
}

export async function getResidentAnnouncements(propertyId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.announcement.findMany({
    where: {
      OR: [
        { property_id: propertyId },
        { property_id: null },
      ],
      status: "Published",
      expiry_date: { gte: today },
    },
    include: {
      property: { select: { property_id: true, property_name: true } },
      author: { select: { user_name: true, role: true } },
    },
    orderBy: [
      { is_pinned: "desc" },
      { publish_date: "desc" },
      { created_at: "desc" },
    ],
  });
}

export async function getAnnouncementById(announcementId: string) {
  return prisma.announcement.findUnique({
    where: { announcement_id: announcementId },
    include: {
      property: true,
      author: { select: { user_id: true, user_name: true, user_email: true, role: true } },
    },
  });
}
