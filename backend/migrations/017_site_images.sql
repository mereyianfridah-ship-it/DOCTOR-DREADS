-- Admin-managed site images (hero, welcome photos, etc.). One row per slot; no row = use the bundled default.
-- Additive and idempotent.
CREATE TABLE IF NOT EXISTS site_images (
  slot TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  public_id TEXT,
  alt TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

-- media_assets tracks every Cloudinary file so it can be cleaned up; allow the two new kinds.
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_kind_check;
ALTER TABLE media_assets ADD CONSTRAINT media_assets_kind_check
  CHECK (kind IN ('gallery','product','consultation','site','service'));
