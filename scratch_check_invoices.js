const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const invs = await prisma.invoice.findMany({
    include: { lease: { include: { tenant: true, unit: true } } },
    orderBy: { invoice_date: "desc" }
  });
  console.log(invs.map(i => ({ id: i.invoice_id, no: i.invoice_no, date: i.invoice_date, lease: i.lease?.unit?.unit_number })));
}
check().finally(() => prisma.$disconnect());
