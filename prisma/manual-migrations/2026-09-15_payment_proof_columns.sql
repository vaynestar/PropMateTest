ALTER TABLE "payment_transactions"
  ADD COLUMN IF NOT EXISTS "proof_data"     BYTEA,
  ADD COLUMN IF NOT EXISTS "proof_mime"     VARCHAR,
  ADD COLUMN IF NOT EXISTS "proof_filename" VARCHAR,
  ADD COLUMN IF NOT EXISTS "proof_size"     INTEGER,
  ADD COLUMN IF NOT EXISTS "reviewed_by"    UUID,
  ADD COLUMN IF NOT EXISTS "reviewed_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "review_note"    TEXT;
