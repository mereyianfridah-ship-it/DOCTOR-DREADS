-- Recurring closures, part-day closures and stylist days off. Additive and idempotent.
-- stylist_id NULL = the whole salon. The older closed_days table keeps working: its rows are treated
-- as whole-salon, whole-day, one-off closures.
CREATE TABLE IF NOT EXISTS closure_rules (
  id SERIAL PRIMARY KEY,
  stylist_id TEXT,
  recurrence TEXT NOT NULL CHECK (recurrence IN ('once','weekly','yearly')),
  start_date TEXT,                 -- once: first day; weekly: optional "from"
  end_date TEXT,                   -- once: last day (NULL = same day); weekly: optional "until"
  weekday INTEGER CHECK (weekday BETWEEN 0 AND 6),  -- weekly only, 0 = Sunday
  month_day TEXT,                  -- yearly only, "MM-DD"
  start_time TEXT,                 -- both NULL = closed all day, otherwise "HH:MM" [start, end)
  end_time TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS closure_rules_stylist_idx ON closure_rules (stylist_id);
