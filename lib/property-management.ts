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

export async function listProperties() {
  return prisma.propertyMaster.findMany({
    orderBy: { created_at: "desc" },
    include: { _count: { select: { units: true } } },
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
