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

  const clash = await prisma.ticketCategoryMaster.findFirst({
    where: { category_name: { equals: name, mode: "insensitive" } },
    select: { category_name: true },
  });
  if (clash) {
    throw new Error(`"${clash.category_name}" already exists.`);
  }

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

/**
 * Tickets store the category NAME, not the id - there is no foreign key - so
 * deleting a category in use does not fail. It leaves every one of those
 * tickets pointing at a category that no longer exists, and the reports keep
 * grouping by a name the masterfile has forgotten. Switching a category off
 * hides it from the forms without touching history, which is what "retire this
 * category" actually means.
 */
export async function deleteTicketCategory(categoryId: string) {
  const category = await prisma.ticketCategoryMaster.findUnique({
    where: { category_id: categoryId },
    select: { category_name: true },
  });
  if (!category) throw new Error("That category no longer exists.");

  const inUse = await prisma.ticket.count({
    where: { ticket_category: category.category_name },
  });
  if (inUse > 0) {
    throw new Error(
      `${inUse} ticket${inUse === 1 ? "" : "s"} use "${category.category_name}". Switch it off instead — deleting it would leave those tickets with a category that no longer exists.`
    );
  }

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
    resolved_at?: Date | null; 
    modified_by?: string;
    cost?: number;
    assigned_to?: string | null;
    remark?: string | null;
  } = {
    status,
    modified_by: modifiedBy,
  };

  if (cost !== undefined && !isNaN(cost)) {
    data.cost = cost;
  }

  // `undefined` tells Prisma "leave this field alone", so clearing the field
  // in the form kept the old value: picking "Unassigned" did nothing, and a
  // remark could never be removed once written. `null` is what clears a column.
  if (assignedTo !== undefined) {
    data.assigned_to = assignedTo.trim() === "" ? null : assignedTo;
  }

  if (remark !== undefined) {
    data.remark = remark.trim() === "" ? null : remark.trim();
  }

  const existing = await prisma.ticket.findUnique({
    where: { ticket_id: trimmedId },
    select: { status: true, resolved_at: true },
  });
  if (!existing) throw new Error("That ticket no longer exists.");

  const isDone = (v: string) => v === "Resolved" || v === "Closed";

  /*
   * resolved_at used to be stamped on every save while the status was Resolved
   * or Closed, so editing the remark on a ticket resolved last month reset its
   * resolution date to today - quietly destroying the record and any
   * time-to-resolve figure built on it. And reopening a ticket left the old
   * date in place, so a ticket could be Open and resolved at the same time.
   */
  if (isDone(status) && !isDone(existing.status)) {
    data.resolved_at = new Date();
  } else if (!isDone(status) && isDone(existing.status)) {
    data.resolved_at = null;
  }

  return prisma.ticket.update({
    where: { ticket_id: trimmedId },
    data,
  });
}
