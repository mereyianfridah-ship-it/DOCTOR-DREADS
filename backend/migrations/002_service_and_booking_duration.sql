-- Duration support for bookings.
-- Services get a numeric duration (minutes); bookings snapshot duration at
-- creation time so overlap checks stay stable even if a service's duration changes.
-- Backfilled with a conservative default; existing rows keep working.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE services ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60;
  END IF;
END $$;

-- Hard backstop: a stylist cannot hold two active bookings for the exact same slot.
-- (Duration-aware overlap is enforced in the booking transaction; this index
--  catches any race that slips through at the exact-start-time level.)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_slot_per_stylist
  ON bookings (date, time, stylist_id)
  WHERE status IN ('pending_deposit', 'confirmed');
