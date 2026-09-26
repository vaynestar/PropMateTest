/**
 * Every id in the schema is `@db.Uuid`, so Postgres rejects a malformed one
 * before it ever looks for a row: Prisma throws and the page answers 500
 * instead of 404 (R8). Check the shape first and treat anything else as a
 * miss - a 404 also stops the URL confirming what does and doesn't exist.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID.test(value);
