-- Dates the salon is closed (holidays, leave, events). Additive and idempotent.
CREATE TABLE IF NOT EXISTS closed_days (
  date TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
