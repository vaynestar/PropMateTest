import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    property: true;
    unit: { include: { property: true } };
    lease: { include: { unit: { include: { property: true } }; tenant: true } };
    reporter: { select: { user_name: true; user_email: true; phone_number: true } };
  };
}>;

const VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const VALID_STATUSES = ["Open", "In Progress", "Pending Parts", "KIV", "Resolved", "Closed"];

function requireText(value: unknown, fieldName: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new Error(`${fieldName} is required`);
  return trimmed;
}

export async function listTicketCategories() {
  return prisma.ticketCategoryMaster.findMany({
    orderBy: { category_name: "asc" },
  });
}

export async function createTicketCategory(categoryName: string, description?: string) {
  const name = requireText(categoryName, "Category name");
  return prisma.ticketCategoryMaster.create({
    data: {
      category_name: name,
      description: description?.trim() || null,
    },
  });
}

export async function toggleTicketCategory(categoryId: string, isActive: boolean) {
  return prisma.ticketCategoryMaster.update({
    where: { category_id: categoryId },
    data: { is_active: isActive },
  });
}

export async function deleteTicketCategory(categoryId: string) {
  return prisma.ticketCategoryMaster.delete({
    where: { category_id: categoryId },
  });
}

export async function listTickets(propertyId?: string): Promise<TicketWithRelations[]> {
  return prisma.ticket.findMany({
    where: propertyId
      ? {
          OR: [
            { property_id: propertyId },
            { lease: { unit: { property_id: propertyId } } },
            { unit: { property_id: propertyId } },
          ],
        }
      : undefined,
    orderBy: { created_at: "desc" },
    include: {
      property: true,
      unit: { include: { property: true } },
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
      reporter: { select: { user_name: true, user_email: true, phone_number: true } },
    },
  });
}

export async function getRecentTickets(limit = 5): Promise<TicketWithRelations[]> {
  return prisma.ticket.findMany({
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      property: true,
      unit: { include: { property: true } },
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
      reporter: { select: { user_name: true, user_email: true, phone_number: true } },
    },
  });
}

export async function raiseTicket(input: {
  property_id?: string;
  unit_id?: string;
  location_type?: string; // "Unit" | "Common Area"
  location_detail?: string;
  requester_id: string;
  title: string;
  description: string;
  ticket_category: string;
  priority: string;
  createdBy?: string;
}) {
  let propertyId = input.property_id || null;
  let leaseId: string | null = null;
  let unitId = input.unit_id || null;
  const locationType = input.location_type || (unitId ? "Unit" : "Common Area");

  if (locationType === "Unit" && unitId) {
    const unit = await prisma.unit.findUnique({
      where: { unit_id: unitId },
      include: { leases: { where: { status: "Active" }, take: 1 } },
    });
    if (unit) {
      propertyId = unit.property_id;
      if (unit.leases.length > 0) {
        leaseId = unit.leases[0].lease_id;
      }
    }
  } else if (!propertyId && unitId) {
    const unit = await prisma.unit.findUnique({
      where: { unit_id: unitId },
      select: { property_id: true },
    });
    if (unit) propertyId = unit.property_id;
  }

  const priority = VALID_PRIORITIES.includes(input.priority)
    ? input.priority
    : "Medium";
  const category = requireText(input.ticket_category, "Ticket category");

  return prisma.ticket.create({
    data: {
      property_id: propertyId,
      lease_id: leaseId,
      unit_id: locationType === "Unit" ? unitId : null,
      location_type: locationType,
      location_detail: input.location_detail?.trim() || null,
      requester_id: input.requester_id,
      title: requireText(input.title, "Title"),
      description: requireText(input.description, "Description"),
      ticket_category: category,
      priority,
      status: "Open",
      created_by: input.createdBy,
    },
  });
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  modifiedBy?: string,
  cost?: number,
  assignedTo?: string,
  remark?: string
) {
  const trimmedId = ticketId.trim();
  if (!trimmedId) throw new Error("Ticket ID is required");
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const data: { 
    status: string; 
    resolved_at?: Date; 
    modified_by?: string;
    cost?: number;
    assigned_to?: string;
    remark?: string;
  } = {
    status,
    modified_by: modifiedBy,
  };

  if (cost !== undefined && !isNaN(cost)) {
    data.cost = cost;
  }

  if (assignedTo !== undefined) {
    data.assigned_to = assignedTo.trim() === "" ? undefined : assignedTo;
  }

  if (remark !== undefined) {
    data.remark = remark.trim() === "" ? undefined : remark.trim();
  }

  if (status === "Resolved" || status === "Closed") {
    data.resolved_at = new Date();
  }

  return prisma.ticket.update({
    where: { ticket_id: trimmedId },
    data,
  });
}
