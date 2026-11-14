-- Appointment reminder emails. reminder_sent_at is the claim that stops a booking being reminded twice.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TEXT;
CREATE INDEX IF NOT EXISTS ix_bookings_reminder_due ON bookings(date) WHERE status = 'confirmed' AND reminder_sent_at IS NULL;
