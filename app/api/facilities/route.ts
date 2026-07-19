import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use the singleton we created to protect your database connections!

export async function GET() {
  try {
    const facilities = await prisma.facility.findMany({
      include: { property: true }, // This pulls in the related property data too!
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json(facilities);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // FYP HACK: Ensure at least one property exists to satisfy the Foreign Key constraint
    let prop = await prisma.propertyMaster.findFirst();
    
    if (!prop) {
      prop = await prisma.propertyMaster.create({
        data: {
          property_name: "Default FYP Property",
          property_type: "Residential",
          address: "Test Address",
          city: "Kuala Lumpur",
          state: "KL",
          country: "Malaysia",
          postal_code: "50000",
          total_units: 100
        }
      });
    }

    const newFacility = await prisma.facility.create({
      data: {
        facility_name: body.facility_name,
        facility_type: body.facility_type,
        max_capacity: parseInt(body.capacity), // ✅ Fixed: Mapped to max_capacity
        is_bookable: body.is_bookable,
        property_id: prop.property_id // Attach it to our property!
      }
    });

    return NextResponse.json(newFacility);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('Facility ID required');

    await prisma.facility.delete({ where: { facility_id: id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await prisma.facility.update({
      where: { facility_id: body.facility_id },
      data: {
        facility_name: body.facility_name,
        facility_type: body.facility_type,
        max_capacity: parseInt(body.capacity), // ✅ Fixed: Mapped to max_capacity
        is_bookable: body.is_bookable,
      }
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}