import prisma from "@/lib/prisma";

function requireText(value: unknown, fieldName: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) throw new Error(`${fieldName} is required`);
  return trimmed;
}

function parseIntField(value: unknown, fieldName: string): number {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

type PropertyInput = {
  property_name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  total_units: number | string;
};

/**
 * Every picker, switcher and report shows the buildings the office still
 * manages. An archived one stays in the database and stays readable on the
 * Properties page, but it is not somewhere new work can be filed.
 */
export const LIVE_PROPERTIES = { is_archived: false } as const;

export async function listProperties() {
  return prisma.propertyMaster.findMany({
    orderBy: [{ is_archived: "asc" }, { created_at: "desc" }],
    include: {
      _count: {
        select: {
          units: true,
          facilities: true,
          tickets: true,
          announcements: true,
        },
      },
      units: {
        select: {
          status: true,
        },
      },
    },
  });
}

export async function createProperty(input: PropertyInput, createdBy?: string) {
  return prisma.propertyMaster.create({
    data: {
      property_name: requireText(input.property_name, "Property name"),
      property_type: requireText(input.property_type, "Property type"),
      address: requireText(input.address, "Address"),
      city: requireText(input.city, "City"),
      state: requireText(input.state, "State"),
      country: requireText(input.country, "Country"),
      postal_code: requireText(input.postal_code, "Postal code"),
      total_units: parseIntField(input.total_units, "Total units"),
      created_by: createdBy,
    },
  });
}

export async function updateProperty(
  propertyId: string,
  input: PropertyInput,
  modifiedBy?: string
) {
  return prisma.propertyMaster.update({
    where: { property_id: propertyId },
    data: {
      property_name: requireText(input.property_name, "Property name"),
      property_type: requireText(input.property_type, "Property type"),
      address: requireText(input.address, "Address"),
      city: requireText(input.city, "City"),
      state: requireText(input.state, "State"),
      country: requireText(input.country, "Country"),
      postal_code: requireText(input.postal_code, "Postal code"),
      total_units: parseIntField(input.total_units, "Total units"),
      modified_by: modifiedBy,
    },
  });
}

export async function deleteProperty(propertyId: string) {
  return prisma.propertyMaster.delete({ where: { property_id: propertyId } });
}

/**
 * Archiving is the ordinary way a building leaves the register: deleting one
 * would take its units, tenancies and invoices with it, which is why the
 * delete fails as soon as a property has any. An archived property keeps all
 * of that and simply stops being offered.
 */
export async function setPropertyArchived(
  propertyId: string,
  archived: boolean,
  modifiedBy?: string
) {
  return prisma.propertyMaster.update({
    where: { property_id: propertyId },
    data: {
      is_archived: archived,
      // A building nobody manages cannot be the default one.
      ...(archived ? { is_default: false } : {}),
      modified_by: modifiedBy,
    },
  });
}
