import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding non-bookable common area facilities under Testing property...");

  let property = await prisma.propertyMaster.findFirst({
    where: { property_name: { contains: "Testing", mode: "insensitive" } },
  });

  if (!property) {
    property = await prisma.propertyMaster.findFirst();
  }

  if (!property) {
    console.error("No properties found in database!");
    return;
  }

  console.log(`Target property: "${property.property_name}" (${property.property_id})`);

  const nonBookableFacilities = [
    {
      facility_name: "Main Block Passenger Lift A & B",
      facility_type: "Elevator / Lift",
      max_capacity: 12,
      is_bookable: false,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "00:00",
      close_time: "23:59",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-05"),
    },
    {
      facility_name: "Level 1 Central Corridor & Hallway",
      facility_type: "Hallway / Common Area",
      max_capacity: null,
      is_bookable: false,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "00:00",
      close_time: "23:59",
      facility_status: "Available",
      next_maintenance_date: null,
    },
    {
      facility_name: "Security Guardhouse & Barrier Gate",
      facility_type: "Security System",
      max_capacity: null,
      is_bookable: false,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "00:00",
      close_time: "23:59",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-12"),
    },
    {
      facility_name: "Management Office & Reception Desk",
      facility_type: "Administration",
      max_capacity: 15,
      is_bookable: false,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5",
      open_time: "09:00",
      close_time: "18:00",
      facility_status: "Available",
      next_maintenance_date: null,
    },
    {
      facility_name: "Refuse & Waste Disposal Chute Room",
      facility_type: "Sanitation & Waste",
      max_capacity: null,
      is_bookable: false,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "00:00",
      close_time: "23:59",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-25"),
    },
    {
      facility_name: "EV Fast Charging Station Hub",
      facility_type: "EV Charging",
      max_capacity: 4,
      is_bookable: false,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "00:00",
      close_time: "23:59",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-18"),
    },
  ];

  for (const fac of nonBookableFacilities) {
    const existing = await prisma.facility.findFirst({
      where: {
        property_id: property.property_id,
        facility_name: fac.facility_name,
      },
    });

    if (!existing) {
      await prisma.facility.create({
        data: {
          ...fac,
          property_id: property.property_id,
        },
      });
      console.log(`✓ Created non-bookable facility: ${fac.facility_name}`);
    } else {
      console.log(`- Facility already exists: ${fac.facility_name}`);
    }
  }

  console.log("Non-bookable facilities seeding complete!");
}

main()
  .catch((err) => console.error("Error seeding facilities:", err))
  .finally(() => prisma.$disconnect());
