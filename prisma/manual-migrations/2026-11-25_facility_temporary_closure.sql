-- DEV-289 — a facility closed for a stretch of days, not for ever.
--
-- User: "can facilities add a temporary close option? like badminton court,
-- maybe it is bookable but temporary closed due to mainteance or any other
-- reason, so even if it appear on the list, but grayed out with temporary
-- closed, from what date to what date, time to time".
--
-- Nothing in the schema could say this. There were two blunt instruments and
-- a gap between them:
--
--   facility_status = 'Maintenance'  closed from now until somebody
--                                    remembers to reopen it, with no dates
--                                    and no reason recorded.
--   next_maintenance_date            exactly one day, and it means "a service
--                                    is due", not "we are shut".
--
-- A court closed for resurfacing from the 1st to the 3rd, 9 to 6, is neither.
--
-- A DAILY WINDOW, not one continuous block (user's choice, 2026-11-25). The
-- facility is shut between closed_start_time and closed_end_time on every day
-- from closed_from to closed_until inclusive, and bookable outside those hours
-- — so a court closed for resurfacing in working hours can still be booked at
-- seven in the evening.
--
-- Both times NULL means whole days: the simplest case gets the simplest entry,
-- and it falls out of the same two date columns rather than needing a flag.
--
-- All five nullable. NULL across the board is "not closed", which is what
-- every existing row is and what every new facility starts as — so there is
-- no backfill and no default that could be mistaken for a real closure.
--
-- Times are VARCHAR 'HH:MM' to match open_time and close_time on this same
-- table, which are already stored that way and compared as minutes-since-
-- midnight by toMinutes() in lib/booking-management.ts. A TIME column here
-- would have been the odd one out and would have needed its own conversion at
-- every call site.
--
-- Applied with `npx prisma db execute --file ... --schema prisma/schema.prisma`
-- (`prisma db push` is blocked by the duplicate created_by relation on
-- announcements, since DEV-23).

ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "closed_from" DATE;
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "closed_until" DATE;
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "closed_start_time" VARCHAR;
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "closed_end_time" VARCHAR;
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "closure_reason" VARCHAR;
