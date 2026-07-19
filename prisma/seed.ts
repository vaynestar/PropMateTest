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
  await prisma.invoiceDetail.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tenantLease.deleteMany();
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
    { unit: dhA, lease: leaseDHA, title: "Air-conditioner not cooling", priority: "High", status: "Open" },
    { unit: dhD, lease: leaseDHD, title: "Leaking kitchen faucet", priority: "Medium", status: "In Progress" },
    { unit: tsA, lease: leaseTSA, title: "Lift lobby light flickering", priority: "Low", status: "Resolved" },
    { unit: tsD, lease: leaseTSD, title: "Main door lock jammed", priority: "High", status: "Open" },
  ];
  for (const t of ticketSeeds) {
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
        created_by: resident.user_id,
      },
    });
  }

  console.log("Seed complete: 2 properties, 8 units, 2 users, 4 invoices, 4 tickets.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });