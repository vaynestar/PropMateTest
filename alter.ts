import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding next_maintenance_date to facilities...");
    await prisma.$executeRawUnsafe(`ALTER TABLE facilities ADD COLUMN next_maintenance_date DATE;`);
    console.log("Added next_maintenance_date.");
  } catch (e: any) {
    console.log("Skipped or error:", e.message);
  }

  try {
    console.log("Adding cost to tickets...");
    await prisma.$executeRawUnsafe(`ALTER TABLE tickets ADD COLUMN cost DECIMAL(10,2) DEFAULT 0;`);
    console.log("Added cost.");
  } catch (e: any) {
    console.log("Skipped or error:", e.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
