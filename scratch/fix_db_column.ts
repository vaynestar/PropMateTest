import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Altering facilities table column max_capacity to DROP NOT NULL...");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE facilities ALTER COLUMN max_capacity DROP NOT NULL;`);
    console.log("SUCCESS: max_capacity column in facilities table is now OPTIONAL (NULL allowed)!");
  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
