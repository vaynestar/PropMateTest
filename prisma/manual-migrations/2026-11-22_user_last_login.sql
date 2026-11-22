-- DEV-264 — when a resident last signed in.
--
-- The Residents screen could not tell an account that has been used from one
-- that has never been opened, and "they never signed in" is the most common
-- reason a resident says they were never told something. Nothing in the
-- schema recorded it: there is a failed_login_count and a locked_until, but
-- no record of a SUCCESSFUL sign-in.
--
-- Nullable on purpose. NULL means "has never signed in", which is exactly the
-- state the screen needs to show, and backfilling it with a made-up date
-- would destroy the only information the column carries.
--
-- Applied with `npx prisma db execute --file ... --schema prisma/schema.prisma`
-- (`prisma db push` is blocked by the duplicate created_by relation on
-- announcements, since DEV-23).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP;
