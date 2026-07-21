import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function main() {
  console.log("Seeding PropMate MVP demo data...");

  // Clear in dependency order (child tables first)
  await prisma.ticketComment.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.invoiceDetail.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tenantLease.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.propertyMaster.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      user_name: "Admin PropMate",
      user_email: "admin@propmate.com",
      password_hash: hashPassword("admin123"),
      phone_number: "0123456789",
      role: "Admin",
    },
  });

  const resident = await prisma.user.create({
    data: {
      user_name: "Ahmad Resident",
      user_email: "resident@propmate.com",
      password_hash: hashPassword("resident123"),
      phone_number: "0112233445",
      role: "Resident",
    },
  });

  const rentalCharge = await prisma.chargeMaster.create({
    data: {
      charge_name: "Monthly Rental",
      charge_type: "Recurring",
      uom: "month",
      default_amount: 0,
      description: "Standard monthly rental charge",
      created_by: admin.user_id,
    },
  });

  const prop1 = await prisma.propertyMaster.create({
    data: {
      property_name: "Desa Harmoni Condominium",
      property_type: "Condominium",
      address: "12 Jalan Harmoni",
      city: "Kuala Lumpur",
      state: "Wilayah Persekutuan",
      country: "Malaysia",
      postal_code: "56000",
      total_units: 4,
      created_by: admin.user_id,
    },
  });

  const prop2 = await prisma.propertyMaster.create({
    data: {
      property_name: "Taman Sentosa Apartments",
      property_type: "Apartment",
      address: "45 Jalan Sentosa",
      city: "Petaling Jaya",
      state: "Selangor",
      country: "Malaysia",
      postal_code: "46100",
      total_units: 4,
      created_by: admin.user_id,
    },
  });

  // Desa Harmoni units
  const dhA = await prisma.unit.create({
    data: {
      property_id: prop1.property_id,
      unit_number: "A-01",
      unit_type: "2 Bedroom",
      floor_number: 1,
      area_sqft: 850,
      status: "Occupied",
      monthly_rent: 1500,
      created_by: admin.user_id,
    },
  });
  const dhB = await prisma.unit.create({
    data: {
      property_id: prop1.property_id,
      unit_number: "A-02",
      unit_type: "3 Bedroom",
      floor_number: 2,
      area_sqft: 1100,
      status: "Vacant",
      monthly_rent: 1800,
      created_by: admin.user_id,
    },
  });
  const dhC = await prisma.unit.create({
    data: {
      property_id: prop1.property_id,
      unit_number: "A-03",
      unit_type: "Studio",
      floor_number: 3,
      area_sqft: 500,
      status: "Maintenance",
      monthly_rent: 1100,
      created_by: admin.user_id,
    },
  });
  const dhD = await prisma.unit.create({
    data: {
      property_id: prop1.property_id,
      unit_number: "A-04",
      unit_type: "2 Bedroom",
      floor_number: 4,
      area_sqft: 900,
      status: "Occupied",
      monthly_rent: 1600,
      created_by: admin.user_id,
    },
  });

  // Taman Sentosa units
  const tsA = await prisma.unit.create({
    data: {
      property_id: prop2.property_id,
      unit_number: "B-01",
      unit_type: "3 Bedroom",
      floor_number: 1,
      area_sqft: 1200,
      status: "Occupied",
      monthly_rent: 1700,
      created_by: admin.user_id,
    },
  });
  const tsB = await prisma.unit.create({
    data: {
      property_id: prop2.property_id,
      unit_number: "B-02",
      unit_type: "2 Bedroom",
      floor_number: 2,
      area_sqft: 950,
      status: "Vacant",
      monthly_rent: 1400,
      created_by: admin.user_id,
    },
  });
  const tsC = await prisma.unit.create({
    data: {
      property_id: prop2.property_id,
      unit_number: "B-03",
      unit_type: "Studio",
      floor_number: 3,
      area_sqft: 520,
      status: "Vacant",
      monthly_rent: 1000,
      created_by: admin.user_id,
    },
  });
  const tsD = await prisma.unit.create({
    data: {
      property_id: prop2.property_id,
      unit_number: "B-04",
      unit_type: "3 Bedroom",
      floor_number: 4,
      area_sqft: 1250,
      status: "Occupied",
      monthly_rent: 1750,
      created_by: admin.user_id,
    },
  });

  // Minimal leases for occupied units (no Lease UI in MVP; needed for Invoice/Ticket FK)
  const leaseDHA = await prisma.tenantLease.create({
    data: {
      unit_id: dhA.unit_id,
      user_id: resident.user_id,
      move_in_date: new Date("2025-01-01"),
      status: "Active",
      created_by: admin.user_id,
    },
  });
  const leaseDHD = await prisma.tenantLease.create({
    data: {
      unit_id: dhD.unit_id,
      user_id: admin.user_id,
      move_in_date: new Date("2025-03-15"),
      status: "Active",
      created_by: admin.user_id,
    },
  });
  const leaseTSA = await prisma.tenantLease.create({
    data: {
      unit_id: tsA.unit_id,
      user_id: resident.user_id,
      move_in_date: new Date("2025-02-01"),
      status: "Active",
      created_by: admin.user_id,
    },
  });
  const leaseTSD = await prisma.tenantLease.create({
    data: {
      unit_id: tsD.unit_id,
      user_id: admin.user_id,
      move_in_date: new Date("2025-04-10"),
      status: "Active",
      created_by: admin.user_id,
    },
  });

  // Invoices generated from unit monthly_rent (per occupied unit)
  const occupied: { unit: any; lease: any }[] = [
    { unit: dhA, lease: leaseDHA },
    { unit: dhD, lease: leaseDHD },
    { unit: tsA, lease: leaseTSA },
    { unit: tsD, lease: leaseTSD },
  ];

  let invoiceCounter = 1;
  for (const { unit, lease } of occupied) {
    const month = new Date();
    month.setDate(1);
    const due = new Date(month);
    due.setMonth(due.getMonth() + 1);
    const invNo = `INV-${month.getFullYear()}${String(month.getMonth() + 1).padStart(2, "0")}-${String(invoiceCounter).padStart(3, "0")}`;
    const status = invoiceCounter % 2 === 0 ? "Unpaid" : "Paid";
    await prisma.invoice.create({
      data: {
        lease_id: lease.lease_id,
        invoice_no: invNo,
        invoice_date: month,
        due_date: due,
        total_amount: unit.monthly_rent,
        status,
        created_by: admin.user_id,
        details: {
          create: [
            {
              charge_id: rentalCharge.charge_id,
              description: `Monthly rental - ${unit.unit_number}`,
              uom: "month",
              unit_price: unit.monthly_rent,
              quantity: 1,
              total_price: unit.monthly_rent,
            },
          ],
        },
      },
    });
    invoiceCounter++;
  }

  // A few maintenance tickets (one per occupied unit, varied status)
  const ticketSeeds = [
    { unit: dhA, lease: leaseDHA, title: "Air-conditioner not cooling", priority: "High", status: "Open", cost: 0, monthsAgo: 0 },
    { unit: dhD, lease: leaseDHD, title: "Leaking kitchen faucet", priority: "Medium", status: "In Progress", cost: 0, monthsAgo: 0 },
    { unit: tsA, lease: leaseTSA, title: "Lift lobby light flickering", priority: "Low", status: "Resolved", cost: 150, monthsAgo: 0 },
    { unit: tsD, lease: leaseTSD, title: "Main door lock jammed", priority: "High", status: "Open", cost: 0, monthsAgo: 0 },
    
    // Past closed tickets for the cost graph
    { unit: dhA, lease: leaseDHA, title: "Plumbing fix", priority: "Medium", status: "Closed", cost: 450, monthsAgo: 1 },
    { unit: dhB, lease: leaseDHA, title: "Electrical wiring", priority: "High", status: "Closed", cost: 800, monthsAgo: 2 },
    { unit: tsA, lease: leaseTSA, title: "Window seal replacement", priority: "Low", status: "Closed", cost: 120, monthsAgo: 2 },
    { unit: tsC, lease: leaseTSA, title: "HVAC repair", priority: "High", status: "Closed", cost: 1200, monthsAgo: 3 },
    { unit: dhD, lease: leaseDHD, title: "Painting touchup", priority: "Medium", status: "Closed", cost: 300, monthsAgo: 4 },
  ];
  for (const t of ticketSeeds) {
    const createdDate = new Date();
    createdDate.setMonth(createdDate.getMonth() - t.monthsAgo);
    
    await prisma.ticket.create({
      data: {
        lease_id: t.lease.lease_id,
        requester_id: resident.user_id,
        unit_id: t.unit.unit_id,
        title: t.title,
        description: `${t.title} reported by resident.`,
        ticket_category: "Maintenance",
        priority: t.priority,
        status: t.status,
        cost: t.cost,
        created_at: createdDate,
        resolved_at: t.status === "Closed" || t.status === "Resolved" ? createdDate : null,
        created_by: resident.user_id,
      },
    });
  }

  // Shared facilities (bookable) for the demo
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 15);
  
  await prisma.facility.create({
    data: {
      property_id: prop1.property_id,
      facility_name: "Swimming Pool",
      facility_type: "Swimming Pool",
      facility_status: "Available",
      max_capacity: 20,
      is_bookable: true,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "07:00",
      close_time: "21:00",
      next_maintenance_date: nextMonth,
      created_by: admin.user_id,
    },
  });
  
  const soonDate = new Date();
  soonDate.setDate(soonDate.getDate() + 5);

  await prisma.facility.create({
    data: {
      property_id: prop1.property_id,
      facility_name: "Gymnasium",
      facility_type: "Gym",
      facility_status: "Available",
      max_capacity: 15,
      is_bookable: true,
      operation_days: "1,2,3,4,5,6,7",
      open_time: "06:00",
      close_time: "23:00",
      next_maintenance_date: soonDate,
      created_by: admin.user_id,
    },
  });
  await prisma.facility.create({
    data: {
      property_id: prop2.property_id,
      facility_name: "Function Hall",
      facility_type: "Function Hall",
      facility_status: "Available",
      max_capacity: 100,
      is_bookable: true,
      operation_days: "1,2,3,4,5,6",
      open_time: "09:00",
      close_time: "22:00",
      next_maintenance_date: new Date(new Date().setMonth(new Date().getMonth() + 2)), // 2 months away
      created_by: admin.user_id,
    },
  });

  // Badminton courts (Court A-D) for the booking demo — Mon–Sat 08:00–22:00
  const badmintonCourts = [
    { name: "Badminton Court A", capacity: 4 },
    { name: "Badminton Court B", capacity: 4 },
    { name: "Badminton Court C", capacity: 4 },
    { name: "Badminton Court D", capacity: 4 },
  ];
  const courtIds: string[] = [];
  for (const c of badmintonCourts) {
    const created = await prisma.facility.create({
      data: {
        property_id: prop1.property_id,
        facility_name: c.name,
        facility_type: "Badminton Court",
        facility_status: "Available",
        max_capacity: c.capacity,
        is_bookable: true,
        operation_days: "1,2,3,4,5,6",
        open_time: "08:00",
        close_time: "22:00",
        created_by: admin.user_id,
      },
    });
    courtIds.push(created.facility_id);
  }

  // Sample bookings so the availability bar + clash check are visible on first run.
  // Dates are computed relative to today so they always fall on upcoming open days.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const atTime = (base: Date, hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const sampleBookings = [
    // Court A: tomorrow 10:00–11:30
    { court: 0, dayOffset: 1, start: "10:00", end: "11:30", purpose: "Morning doubles" },
    // Court A: +3 days 15:00–16:30
    { court: 0, dayOffset: 3, start: "15:00", end: "16:30", purpose: "Coaching session" },
    // Court B: tomorrow 14:00–16:00
    { court: 1, dayOffset: 1, start: "14:00", end: "16:00", purpose: "Friendly match" },
    // Court B: +2 days 09:00–10:00
    { court: 1, dayOffset: 2, start: "09:00", end: "10:00", purpose: "Solo practice" },
    // Court C: +2 days 18:00–19:30
    { court: 2, dayOffset: 2, start: "18:00", end: "19:30", purpose: "Evening game" },
    // Court D: +4 days 11:00–12:00
    { court: 3, dayOffset: 4, start: "11:00", end: "12:00", purpose: "Club session" },
    // Court D: +4 days 17:00–18:30
    { court: 3, dayOffset: 4, start: "17:00", end: "18:30", purpose: "Tournament prep" },
  ];
  for (const b of sampleBookings) {
    const date = addDays(b.dayOffset);
    await prisma.booking.create({
      data: {
        facility_id: courtIds[b.court],
        user_id: resident.user_id,
        lease_id: leaseDHA.lease_id,
        booking_date: date,
        booking_status: "Confirmed",
        start_time: atTime(date, b.start),
        end_time: atTime(date, b.end),
        pax_count: 2,
        purpose: b.purpose,
        created_by: resident.user_id,
      },
    });
  }

  // Sample Visitors
  await prisma.visitor.createMany({
    data: [
      {
        lease_id: leaseDHA.lease_id,
        visitor_name: "Ali Bin Abu",
        visitor_ic_no: "900101-14-5555",
        vehicle_plate: "WAB 1234",
        visit_purpose: "Delivery",
        visit_date: addDays(1),
        status: "Approved",
        created_by: resident.user_id,
      },
      {
        lease_id: leaseDHA.lease_id,
        visitor_name: "Siti Aminah",
        visitor_ic_no: "880505-10-6666",
        vehicle_plate: "VBB 9876",
        visit_purpose: "Visiting family",
        visit_date: addDays(3),
        status: "Pending",
        created_by: resident.user_id,
      },
      {
        lease_id: leaseTSA.lease_id,
        visitor_name: "John Doe",
        visitor_ic_no: "G99887766",
        visit_purpose: "Internet Installation",
        visit_date: addDays(0),
        status: "Pending",
        created_by: resident.user_id,
      }
    ]
  });

  console.log("Seed complete: 2 properties, 8 units, 2 users, 4 invoices, 4 tickets, 7 facilities, 7 sample bookings, 3 visitors.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });