-- Customer rescheduling of bookings. Additive and idempotent.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_from TEXT;   -- previous "YYYY-MM-DD HH:MM"
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_at TEXT;
