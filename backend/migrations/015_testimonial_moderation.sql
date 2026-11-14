-- Customer-submitted reviews with admin moderation. Additive and idempotent.
-- Rows that already exist were curated by the owner, so they stay visible ('approved').
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending','approved','rejected'));
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS email TEXT;        -- private: for the owner only, never returned by the public API
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS reviewed_at TEXT;
CREATE INDEX IF NOT EXISTS ix_testimonials_status ON testimonials(status, created_at);
