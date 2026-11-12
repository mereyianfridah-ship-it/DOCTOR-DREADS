-- Cloudinary media asset registry (public IDs + metadata stored in PostgreSQL).
-- No files are stored on local disk.

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('gallery','product','consultation')),
  public_id TEXT NOT NULL UNIQUE,
  secure_url TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  folder TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_media_assets_kind ON media_assets(kind);
CREATE INDEX IF NOT EXISTS ix_media_assets_public_id ON media_assets(public_id);
