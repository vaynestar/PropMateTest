import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding example facilities under Testing property...");

  // 1. Find or create property "Testing"
  let property = await prisma.propertyMaster.findFirst({
    where: { property_name: { contains: "Testing", mode: "insensitive" } },
  });

  if (!property) {
    console.log("Property 'Testing' not found. Fetching first property...");
    property = await prisma.propertyMaster.findFirst();
  }

  if (!property) {
    console.error("No properties found in database!");
    return;
  }

  console.log(`Target property: "${property.property_name}" (${property.property_id})`);

  const sampleFacilities = [
    {
      facility_name: "Olympic Swimming Pool",
      facility_type: "Swimming Pool",
      max_capacity: 50,
      is_bookable: true,
      max_booking_hours: null,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "07:00",
      close_time: "21:00",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-15"),
    },
    {
      facility_name: "Sky Gym & Fitness Center",
      facility_type: "Gym",
      max_capacity: 30,
      is_bookable: true,
      max_booking_hours: 2,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "06:00",
      close_time: "23:00",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-01"),
    },
    {
      facility_name: "Grand Ballroom / Function Hall",
      facility_type: "Function Hall",
      max_capacity: 150,
      is_bookable: true,
      max_booking_hours: 4,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "09:00",
      close_time: "22:00",
      facility_status: "Available",
      next_maintenance_date: null,
    },
    {
      facility_name: "BBQ Pavilion A",
      facility_type: "BBQ Area",
      max_capacity: 15,
      is_bookable: true,
      max_booking_hours: 3,
      operation_days: "5,6,7",
      open_time: "10:00",
      close_time: "22:00",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-10"),
    },
    {
      facility_name: "Rooftop Tennis Court",
      facility_type: "Tennis Court",
      max_capacity: 4,
      is_bookable: true,
      max_booking_hours: 2,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "07:00",
      close_time: "20:00",
      facility_status: "Available",
      next_maintenance_date: new Date("2026-08-20"),
    },
    {
      facility_name: "Executive Co-Working Space",
      facility_type: "Co-Working Space",
      max_capacity: 25,
      is_bookable: true,
      max_booking_hours: 8,
      operation_days: "1,2,3,4,5,6",
      open_time: "08:00",
      close_time: "22:00",
      facility_status: "Available",
      next_maintenance_date: null,
    },
  ];

  for (const fac of sampleFacilities) {
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
      console.log(`✓ Created facility: ${fac.facility_name}`);
    } else {
      console.log(`- Facility already exists: ${fac.facility_name}`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((err) => console.error("Error seeding facilities:", err))
  .finally(() => prisma.$disconnect());
