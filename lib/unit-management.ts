import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

type UnitInput = {
  property_id?: string | null;
  unit_number: string;
  unit_type: string;
  floor_number: number | string;
  area_sqft: number | string;
  monthly_rent?: number | string;
  status?: string | null;
};

type UpdateUnitInput = UnitInput & {
  unit_id: string;
};

function requireText(value: string, fieldName: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmed;
}

function parseFloorNumber(value: number | string) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (Number.isNaN(parsed)) {
    throw new Error('Floor number must be a valid integer');
  }

  return parsed;
}

function parseAreaSqft(value: number | string) {
  const raw = String(value).trim();
  const parsed = Number(raw);

  if (!raw || Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Area sqft must be a positive number');
  }

  return new Prisma.Decimal(raw);
}

function normalizeStatus(status?: string | null) {
  const trimmed = status?.trim();
  return trimmed || 'Vacant';
}

function parseMonthlyRent(value?: number | string) {
  const raw = value === undefined || value === null ? '' : String(value).trim();
  const parsed = raw ? Number(raw) : 0;

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error('Monthly rent must be a valid non-negative number');
  }

  return new Prisma.Decimal(parsed.toFixed(2));
}

export async function listUnits() {
  return prisma.unit.findMany({
    include: { property: true },
    orderBy: { created_at: 'desc' },
  });
}

export async function listPropertiesForUnits() {
  return prisma.propertyMaster.findMany({
    select: {
      property_id: true,
      property_name: true,
      property_type: true,
      city: true,
      state: true,
    },
    orderBy: { created_at: 'asc' },
  });
}

export async function ensureDefaultProperty() {
  const existingProperty = await prisma.propertyMaster.findFirst({
    orderBy: { created_at: 'asc' },
  });

  if (existingProperty) {
    return existingProperty;
  }

  return prisma.propertyMaster.create({
    data: {
      property_name: 'Default FYP Property',
      property_type: 'Residential',
      address: 'Test Address',
      city: 'Kuala Lumpur',
      state: 'KL',
      country: 'Malaysia',
      postal_code: '50000',
      total_units: 0,
    },
  });
}

export async function createUnit(input: UnitInput) {
  const propertyId = input.property_id?.trim()
    ? input.property_id.trim()
    : (await ensureDefaultProperty()).property_id;

  return prisma.unit.create({
    data: {
      property_id: propertyId,
      unit_number: requireText(input.unit_number, 'Unit number'),
      unit_type: requireText(input.unit_type, 'Unit type'),
      floor_number: parseFloorNumber(input.floor_number),
      area_sqft: parseAreaSqft(input.area_sqft),
      monthly_rent: parseMonthlyRent(input.monthly_rent),
      status: normalizeStatus(input.status),
    },
    include: { property: true },
  });
}

export async function updateUnit(input: UpdateUnitInput) {
  const unitId = input.unit_id.trim();

  if (!unitId) {
    throw new Error('Unit ID is required');
  }

  const propertyId = input.property_id?.trim();

  return prisma.unit.update({
    where: { unit_id: unitId },
    data: {
      ...(propertyId ? { property_id: propertyId } : {}),
      unit_number: requireText(input.unit_number, 'Unit number'),
      unit_type: requireText(input.unit_type, 'Unit type'),
      floor_number: parseFloorNumber(input.floor_number),
      area_sqft: parseAreaSqft(input.area_sqft),
      monthly_rent: parseMonthlyRent(input.monthly_rent),
      status: normalizeStatus(input.status),
    },
    include: { property: true },
  });
}

export async function deleteUnit(unitId: string) {
  const trimmedId = unitId.trim();

  if (!trimmedId) {
    throw new Error('Unit ID is required');
  }

  await prisma.unit.delete({
    where: { unit_id: trimmedId },
  });
}
