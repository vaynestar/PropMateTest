const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({ where: { role: 'Resident' }});
    const unit = await prisma.unit.findFirst({ where: { status: 'Vacant' }});
    
    if (!user || !unit) {
      console.log("No user or unit found");
      return;
    }

    console.log("Found user:", user.user_id, "unit:", unit.unit_id);

    // Call the same logic as createLease
    const activeLease = await prisma.tenantLease.findFirst({
      where: { unit_id: unit.unit_id, status: "Active" }
    });

    if (activeLease) {
      throw new Error("Unit is already leased to a tenant");
    }

    const lease = await prisma.$transaction(async (tx) => {
      const created = await tx.tenantLease.create({
        data: {
          unit_id: unit.unit_id,
          user_id: user.user_id,
          move_in_date: new Date("2026-07-01"),
          status: "Active",
          created_by: user.user_id,
        },
      });

      await tx.unit.update({
        where: { unit_id: unit.unit_id },
        data: { status: "Occupied" },
      });

      return created;
    });

    console.log("Lease created successfully:", lease.lease_id);
  } catch (e) {
    console.error("Error creating lease:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
