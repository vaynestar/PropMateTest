-- DEV-256 — tickets get a number a person can say out loud.
--
-- Until now a ticket's only identifier was its UUID, and the UI showed the
-- first eight characters: "#AC7BBCB2". Nobody reads that over the phone to a
-- contractor. Invoices have had invoice_no since the billing module shipped;
-- this gives tickets the same courtesy.
--
-- Applied with `npx prisma db execute --file ... --schema prisma/schema.prisma`,
-- the project's standing workaround: `prisma db push` has been unusable since
-- DEV-23 because of the duplicate created_by relation on announcements.

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticket_no" VARCHAR;

-- Backfill in creation order, so the oldest ticket is PM-0001 and the numbers
-- agree with the order the queue is read in.
WITH numbered AS (
  SELECT
    ticket_id,
    'PM-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at, ticket_id))::text, 4, '0') AS assigned
  FROM tickets
)
UPDATE tickets t
   SET ticket_no = n.assigned
  FROM numbered n
 WHERE t.ticket_id = n.ticket_id
   AND t.ticket_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_no_key" ON "tickets" ("ticket_no");
