-- DEV-266 — internal notes on a ticket.
--
-- The thread had one kind of message, and everything written in it went to
-- the resident. An office that wants to say "the contractor quoted RM 1,800
-- in May, check whether the May service covered it" has nowhere to put it,
-- so it goes in a WhatsApp group and leaves the ticket.
--
-- Defaulted false, so every existing comment stays a message to the
-- resident, which is what they already were.
--
-- Applied with `npx prisma db execute` — `prisma db push` is blocked by the
-- duplicate created_by relation on announcements (since DEV-23).

ALTER TABLE "ticket_comments"
  ADD COLUMN IF NOT EXISTS "is_internal" BOOLEAN NOT NULL DEFAULT false;
