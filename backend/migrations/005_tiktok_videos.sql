-- TikTok video catalog (URLs only -- videos are never downloaded or rehosted).

CREATE TABLE IF NOT EXISTS tiktok_videos (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_tiktok_videos_published ON tiktok_videos(published, sort_order);
