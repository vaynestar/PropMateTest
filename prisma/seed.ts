import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

// Helpers for dates
const today = new Date();
today.setHours(0, 0, 0, 0);

function addDays(d: Date, days: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function addMonths(d: Date, months: number) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + months);
  return date;
}

function startOfMonth(d: Date) {
  const date = new Date(d);
  date.setDate(1);
  return date;
}

function atTime(d: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date(d);
  date.setHours(h, m, 0, 0);
  return date;
}

async function main() {
  console.log("Seeding PropMate MVP standardized demo data...");

  // Clear in dependency order
  await prisma.ticketComment.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.leaseCharge.deleteMany();
  await prisma.invoiceDetail.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tenantLease.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.propertyMaster.deleteMany();
  await prisma.user.deleteMany();
  await prisma.chargeMaster.deleteMany();

  // --- USERS ---
  const admin = await prisma.user.create({
    data: {
      user_name: "Admin PropMate",
      user_email: "admin@propmate.com",
      password_hash: hashPassword("admin123"),
      phone_number: "0123456789",
      role: "Admin",
    },
  });

  const res1 = await prisma.user.create({
    data: {
      user_name: "Ahmad Resident",
      user_email: "ahmad@propmate.com",
      password_hash: hashPassword("resident123"),
      phone_number: "0112233445",
      role: "Resident",
    },
  });

  const res2 = await prisma.user.create({
    data: {
      user_name: "John Doe",
      user_email: "john@propmate.com",
      password_hash: hashPassword("resident123"),
      phone_number: "0198877665",
      role: "Resident",
    },
  });

  const res3 = await prisma.user.create({
    data: {
      user_name: "Siti Aminah",
      user_email: "siti@propmate.com",
      password_hash: hashPassword("resident123"),
      phone_number: "0134455667",
      role: "Resident",
    },
  });

  // --- CHARGE MASTERS ---
  const chargeRent = await prisma.chargeMaster.create({
    data: { charge_name: "Monthly Rental", charge_type: "Recurring", uom: "month", default_amount: 0, description: "Standard monthly rental", created_by: admin.user_id },
  });
  const chargePark = await prisma.chargeMaster.create({
    data: { charge_name: "Parking Fee", charge_type: "Recurring", uom: "month", default_amount: 100, description: "Monthly parking bay fee", created_by: admin.user_id },
  });
  const chargeMaint = await prisma.chargeMaster.create({
    data: { charge_name: "Maintenance Fee", charge_type: "Recurring", uom: "month", default_amount: 250, description: "Property maintenance fee", created_by: admin.user_id },
  });
  const chargeSec = await prisma.chargeMaster.create({
    data: { charge_name: "Security Fee", charge_type: "Recurring", uom: "month", default_amount: 50, description: "24-hour security fee", created_by: admin.user_id },
  });
  const chargeCard = await prisma.chargeMaster.create({
    data: { charge_name: "Access Card", charge_type: "One-Time", uom: "piece", default_amount: 30, description: "Replacement access card", created_by: admin.user_id },
  });

  // --- PROPERTIES ---
  const prop1 = await prisma.propertyMaster.create({
    data: { property_name: "Desa Harmoni Condominium", property_type: "Condominium", address: "12 Jalan Harmoni", city: "Kuala Lumpur", state: "WP", country: "Malaysia", postal_code: "56000", total_units: 4, created_by: admin.user_id },
  });
  const prop2 = await prisma.propertyMaster.create({
    data: { property_name: "Taman Sentosa Apartments", property_type: "Apartment", address: "45 Jalan Sentosa", city: "Petaling Jaya", state: "Selangor", country: "Malaysia", postal_code: "46100", total_units: 4, created_by: admin.user_id },
  });
  const prop3 = await prisma.propertyMaster.create({
    data: { property_name: "Apex Commercial Tower", property_type: "Commercial", address: "88 Apex Hub", city: "Shah Alam", state: "Selangor", country: "Malaysia", postal_code: "40000", total_units: 4, created_by: admin.user_id },
  });

  // --- UNITS ---
  const unitsData = [
    { propId: prop1.property_id, no: "A-01", type: "2 Bedroom", sqft: 850, rent: 1500, tenant: res1 },
    { propId: prop1.property_id, no: "A-02", type: "3 Bedroom", sqft: 1100, rent: 1800, tenant: res2 },
    { propId: prop1.property_id, no: "A-03", type: "Studio", sqft: 500, rent: 1100, tenant: null }, // Vacant
    { propId: prop1.property_id, no: "A-04", type: "2 Bedroom", sqft: 900, rent: 1600, tenant: res3 },
    { propId: prop2.property_id, no: "B-01", type: "3 Bedroom", sqft: 1200, rent: 1700, tenant: res1 },
    { propId: prop2.property_id, no: "B-02", type: "2 Bedroom", sqft: 950, rent: 1400, tenant: res2 },
    { propId: prop2.property_id, no: "B-03", type: "Studio", sqft: 520, rent: 1000, tenant: null }, // Vacant
    { propId: prop2.property_id, no: "B-04", type: "3 Bedroom", sqft: 1250, rent: 1750, tenant: res3 },
    { propId: prop3.property_id, no: "C-01", type: "Retail Lot", sqft: 2000, rent: 4500, tenant: res2 },
    { propId: prop3.property_id, no: "C-02", type: "Office", sqft: 1500, rent: 3000, tenant: res1 },
  ];

  const occupiedUnits: any[] = [];
  
  for (const u of unitsData) {
    const unit = await prisma.unit.create({
      data: {
        property_id: u.propId,
        unit_number: u.no,
        unit_type: u.type,
        floor_number: 1,
        area_sqft: u.sqft,
        status: u.tenant ? "Occupied" : "Vacant",
        monthly_rent: u.rent,
        created_by: admin.user_id,
      }
    });

    if (u.tenant) {
      const moveIn = addMonths(today, -6);
      const lease = await prisma.tenantLease.create({
        data: {
          unit_id: unit.unit_id,
          user_id: u.tenant.user_id,
          move_in_date: moveIn,
          status: "Active",
          created_by: admin.user_id,
        }
      });
      occupiedUnits.push({ unit, lease, tenant: u.tenant });

      // Create Lease Charges
      const charges = [
        { lease_id: lease.lease_id, charge_id: chargeRent.charge_id, amount: unit.monthly_rent, quantity: 1, created_by: admin.user_id },
        { lease_id: lease.lease_id, charge_id: chargeMaint.charge_id, amount: 250, quantity: 1, created_by: admin.user_id },
      ];
      // Randomly add parking or security
      if (Math.random() > 0.5) charges.push({ lease_id: lease.lease_id, charge_id: chargePark.charge_id, amount: 100, quantity: 1, created_by: admin.user_id });
      if (Math.random() > 0.5) charges.push({ lease_id: lease.lease_id, charge_id: chargeSec.charge_id, amount: 50, quantity: 1, created_by: admin.user_id });
      
      await prisma.leaseCharge.createMany({ data: charges });
    }
  }

  // --- INVOICES (Historical & Current) ---
  const currentMonthStart = startOfMonth(today);
  const monthsToGenerate = [-2, -1, 0]; // 2 months ago, last month, this month

  let invoiceCounter = 1;
  const leaseChargesList = await prisma.leaseCharge.findMany({ include: { charge: true } });

  for (const mOffset of monthsToGenerate) {
    const invDate = addMonths(currentMonthStart, mOffset);
    const dueDate = addMonths(invDate, 1);
    
    for (const { unit, lease } of occupiedUnits) {
      const invNo = `INV-${invDate.getFullYear()}${String(invDate.getMonth() + 1).padStart(2, "0")}-${String(invoiceCounter).padStart(3, "0")}`;
      const status = mOffset === 0 ? "Unpaid" : "Paid"; // Past are paid, current unpaid
      
      const myCharges = leaseChargesList.filter(lc => lc.lease_id === lease.lease_id);
      let total = 0;
      
      const detailsInput = myCharges.map(lc => {
        const lineTotal = Number(lc.amount) * Number(lc.quantity);
        total += lineTotal;
        return {
          charge_id: lc.charge_id,
          description: `${lc.charge.charge_name} - ${unit.unit_number}`,
          uom: lc.charge.uom,
          unit_price: lc.amount,
          quantity: lc.quantity,
          total_price: lineTotal,
        };
      });

      if (mOffset < 0 && Math.random() > 0.8) {
        total += 30;
        detailsInput.push({
          charge_id: chargeCard.charge_id,
          description: "Access Card Replacement",
          uom: "piece",
          unit_price: 30 as any,
          quantity: 1 as any,
          total_price: 30 as any,
        });
      }

      await prisma.invoice.create({
        data: {
          lease_id: lease.lease_id,
          invoice_no: invNo,
          invoice_date: invDate,
          due_date: dueDate,
          total_amount: total,
          status,
          created_by: admin.user_id,
          details: { create: detailsInput },
        }
      });
      invoiceCounter++;
    }
  }

  // --- TICKETS ---
  const ticketSeeds = [
    { title: "Air-conditioner not cooling", category: "Maintenance", priority: "High", status: "Closed", cost: 250, monthsAgo: 2 },
    { title: "Leaking kitchen faucet", category: "Maintenance", priority: "Medium", status: "Closed", cost: 120, monthsAgo: 1 },
    { title: "Keycard stopped working", category: "General", priority: "Low", status: "Resolved", cost: 0, monthsAgo: 1 },
    { title: "Main door lock jammed", category: "Maintenance", priority: "High", status: "In Progress", cost: 0, monthsAgo: 0 },
    { title: "Noisy neighbors", category: "Complaint", priority: "Medium", status: "Open", cost: 0, monthsAgo: 0 },
    { title: "Lift lobby light flickering", category: "Maintenance", priority: "Low", status: "Open", cost: 0, monthsAgo: 0 },
    { title: "Pest control request", category: "Maintenance", priority: "Medium", status: "Closed", cost: 300, monthsAgo: 3 },
    { title: "Balcony drain clogged", category: "Maintenance", priority: "High", status: "Closed", cost: 150, monthsAgo: 2 },
  ];

  for (let i = 0; i < ticketSeeds.length; i++) {
    const t = ticketSeeds[i];
    const target = occupiedUnits[i % occupiedUnits.length];
    const createdDate = addMonths(today, -t.monthsAgo);
    
    await prisma.ticket.create({
      data: {
        lease_id: target.lease.lease_id,
        requester_id: target.tenant.user_id,
        unit_id: target.unit.unit_id,
        title: t.title,
        description: `${t.title} reported by ${target.tenant.user_name}.`,
        ticket_category: t.category,
        priority: t.priority,
        status: t.status,
        cost: t.cost,
        created_at: createdDate,
        resolved_at: (t.status === "Closed" || t.status === "Resolved") ? addDays(createdDate, 2) : null,
        created_by: target.tenant.user_id,
      }
    });
  }

  // --- FACILITIES ---
  const facPool = await prisma.facility.create({
    data: { property_id: prop1.property_id, facility_name: "Infinity Pool", facility_type: "Swimming Pool", facility_status: "Available", max_capacity: 20, is_bookable: true, operation_days: "1,2,3,4,5,6,7", open_time: "07:00", close_time: "21:00", created_by: admin.user_id },
  });
  const facGym = await prisma.facility.create({
    data: { property_id: prop1.property_id, facility_name: "Resident Gym", facility_type: "Gym", facility_status: "Available", max_capacity: 15, is_bookable: true, operation_days: "1,2,3,4,5,6,7", open_time: "06:00", close_time: "23:00", created_by: admin.user_id },
  });
  const facHall = await prisma.facility.create({
    data: { property_id: prop2.property_id, facility_name: "Grand Function Hall", facility_type: "Function Hall", facility_status: "Available", max_capacity: 100, is_bookable: true, operation_days: "1,2,3,4,5,6", open_time: "09:00", close_time: "22:00", created_by: admin.user_id },
  });

  // --- BOOKINGS ---
  const bookingSeeds = [
    { fac: facPool, dayOffset: -5, start: "10:00", end: "12:00", status: "Completed" },
    { fac: facGym, dayOffset: -2, start: "18:00", end: "19:00", status: "Completed" },
    { fac: facPool, dayOffset: 1, start: "08:00", end: "10:00", status: "Confirmed" },
    { fac: facHall, dayOffset: 3, start: "14:00", end: "18:00", status: "Confirmed" },
    { fac: facGym, dayOffset: 1, start: "19:00", end: "20:30", status: "Pending" },
  ];

  for (let i = 0; i < bookingSeeds.length; i++) {
    const b = bookingSeeds[i];
    const target = occupiedUnits[i % occupiedUnits.length];
    const bDate = addDays(today, b.dayOffset);
    
    await prisma.booking.create({
      data: {
        facility_id: b.fac.facility_id,
        user_id: target.tenant.user_id,
        lease_id: target.lease.lease_id,
        booking_date: bDate,
        booking_status: b.status,
        start_time: atTime(bDate, b.start),
        end_time: atTime(bDate, b.end),
        pax_count: b.fac.facility_type === "Function Hall" ? 50 : 2,
        purpose: "Standard usage",
        created_by: target.tenant.user_id,
      }
    });
  }

  // --- VISITORS ---
  const visitorSeeds = [
    { name: "Ali Bin Abu", ic: "900101-14-5555", plate: "WAB 1234", purpose: "Delivery", dayOffset: -3, status: "Completed" },
    { name: "Sarah Lee", ic: "850505-10-6666", plate: "VBB 9876", purpose: "Visiting", dayOffset: -1, status: "Completed" },
    { name: "Michael Chang", ic: "921122-10-1234", plate: "BKS 1122", purpose: "Plumber", dayOffset: 0, status: "Approved" },
    { name: "Siti Nurhaliza", ic: "880808-10-8888", plate: "WWA 8888", purpose: "Visiting", dayOffset: 1, status: "Pending" },
    { name: "David Lim", ic: "991212-14-9999", plate: "JQX 999", purpose: "Internet Install", dayOffset: 2, status: "Approved" },
  ];

  for (let i = 0; i < visitorSeeds.length; i++) {
    const v = visitorSeeds[i];
    const target = occupiedUnits[i % occupiedUnits.length];
    
    await prisma.visitor.create({
      data: {
        lease_id: target.lease.lease_id,
        visitor_name: v.name,
        visitor_ic_no: v.ic,
        vehicle_plate: v.plate,
        visit_purpose: v.purpose,
        visit_date: addDays(today, v.dayOffset),
        status: v.status,
        created_by: target.tenant.user_id,
      }
    });
  }

  console.log("Seed complete: 3 properties, 10 units, 4 users, 24 invoices, 8 tickets, 3 facilities, 5 bookings, 5 visitors.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });