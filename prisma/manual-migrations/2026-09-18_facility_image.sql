-- DEV-184: facility photo (user, 2026-09-18: "might need add picture for facilities").
-- Holds a /api/files/... path from Firebase Storage or an https link; null = no photo.
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_url VARCHAR;
