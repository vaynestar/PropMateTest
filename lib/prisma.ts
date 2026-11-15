import { PrismaClient } from '@prisma/client';

/**
 * What the client omits everywhere, as a type. Prisma's payload helpers need
 * it to describe a row correctly: `Prisma.InvoiceGetPayload<Args, GlobalOmit>`.
 */
export type GlobalOmit = { user: { password_hash: true } };

const prismaClientSingleton = () => {
  /*
   * Nothing hands out a password hash by accident (DEV-224).
   *
   * QC case S11 read the admin API responses and found scrypt hashes in
   * /api/invoices, /api/bookings and /api/tickets: those list functions
   * include the tenant's user row, and `include: { tenant: true }` means every
   * column. The authorisation was right - admins only - but the office's own
   * browser had no business receiving the hash, and one of those payloads
   * reaching a log or a screenshot is a credential leak.
   *
   * Omitting it on the client is the only fix that covers every present and
   * future query. The four places that genuinely need the hash - signing in,
   * and the three change-password paths - ask for it explicitly.
   */
  return new PrismaClient({ omit: { user: { password_hash: true } } });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;