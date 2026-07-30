import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    lease: { include: { unit: { include: { property: true } }; tenant: true } };
  };
}>;

const VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const VALID_STATUSES = ["Open", "In Progress", "Pending Parts", "Resolved", "Closed"];

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
    where: propertyId ? { lease: { unit: { property_id: propertyId } } } : undefined,
    orderBy: { created_at: "desc" },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
    },
  });
}

export async function getRecentTickets(limit = 5): Promise<TicketWithRelations[]> {
  return prisma.ticket.findMany({
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: true,
        },
      },
    },
  });
}

export async function raiseTicket(input: {
  unit_id: string;
  requester_id: string;
  title: string;
  description: string;
  ticket_category: string;
  priority: string;
  createdBy?: string;
}) {
  const unit = await prisma.unit.findUnique({
    where: { unit_id: input.unit_id },
    include: { leases: { where: { status: "Active" }, take: 1 } },
  });
  if (!unit) throw new Error("Selected unit does not exist");

  const lease = unit.leases[0];
  if (!lease) {
    throw new Error("Selected unit has no active lease to attach the ticket to");
  }

  const priority = VALID_PRIORITIES.includes(input.priority)
    ? input.priority
    : "Medium";
  const category = requireText(input.ticket_category, "Ticket category");

  return prisma.ticket.create({
    data: {
      lease_id: lease.lease_id,
      requester_id: input.requester_id,
      unit_id: unit.unit_id,
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
  assignedTo?: string
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
  } = {
    status,
    modified_by: modifiedBy,
  };
  
  if (status === "Resolved" || status === "Closed") {
    data.resolved_at = new Date();
  }
  if (cost !== undefined) {
    data.cost = cost;
  }
  if (assignedTo !== undefined && assignedTo !== "") {
    data.assigned_to = assignedTo;
  }

  return prisma.ticket.update({
    where: { ticket_id: trimmedId },
    data,
  });
}
