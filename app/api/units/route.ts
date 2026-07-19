import { NextResponse } from 'next/server';

import {
  createUnit,
  deleteUnit,
  listUnits,
  updateUnit,
} from '@/lib/unit-management';

export async function GET() {
  try {
    const units = await listUnits();
    return NextResponse.json(units);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch units';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const unit = await createUnit({
      property_id: body.property_id,
      unit_number: body.unit_number,
      unit_type: body.unit_type,
      floor_number: body.floor_number,
      area_sqft: body.area_sqft,
      monthly_rent: body.monthly_rent,
      status: body.status,
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create unit';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const unit = await updateUnit({
      unit_id: body.unit_id,
      property_id: body.property_id,
      unit_number: body.unit_number,
      unit_type: body.unit_type,
      floor_number: body.floor_number,
      area_sqft: body.area_sqft,
      monthly_rent: body.monthly_rent,
      status: body.status,
    });

    return NextResponse.json(unit);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update unit';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('id');

    if (!unitId) {
      throw new Error('Unit ID is required');
    }

    await deleteUnit(unitId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete unit';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
