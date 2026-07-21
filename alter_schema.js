const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE facilities ADD COLUMN max_booking_hours INTEGER');
    console.log("Column added successfully");
  } catch (e) {
    console.error("Error adding column:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
