-- Cancellation requests for bookings (admin-managed)
-- Allows admins to track cancellation requests with reasons
-- Only bookings with status 'pending_deposit' or 'confirmed' can have cancellation requests

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 60;
  END IF;
END $$;

-- Create booking_cancellation_requests table
CREATE TABLE IF NOT EXISTS booking_cancellation_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Index for quick lookup by booking
CREATE INDEX IF NOT EXISTS ix_booking_cancellation_requests_booking_id ON booking_cancellation_requests(booking_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS ix_booking_cancellation_requests_status ON booking_cancellation_requests(status);

-- Comment: Cancellation requests track admin-initiated cancellation reasons.
-- Only 'pending_deposit' and 'confirmed' bookings can have requests.
-- Status flows: pending -> processed (admin decides: cancel or keep)