import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Creating lease_charges table...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."lease_charges" (
          "lease_charge_id" UUID NOT NULL,
          "lease_id" UUID NOT NULL,
          "charge_id" UUID NOT NULL,
          "amount" DECIMAL(10,2) NOT NULL,
          "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "created_by" UUID,
          "_modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "_modified_by" UUID,
          CONSTRAINT "lease_charges_pkey" PRIMARY KEY ("lease_charge_id")
      );
    `);

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."lease_charges" ADD CONSTRAINT "lease_charges_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."tenant_leases"("lease_id") ON DELETE CASCADE ON UPDATE CASCADE;`);
    } catch (e) { console.log(e.message); }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."lease_charges" ADD CONSTRAINT "lease_charges_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charge_master"("charge_id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    } catch (e) { console.log(e.message); }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."lease_charges" ADD CONSTRAINT "lease_charges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (e) { console.log(e.message); }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."lease_charges" ADD CONSTRAINT "lease_charges__modified_by_fkey" FOREIGN KEY ("_modified_by") REFERENCES "public"."users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;`);
    } catch (e) { console.log(e.message); }

    console.log("Table created.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
