-- Deposit refunds on cancellation. Additive and idempotent.
-- refund_status: NULL (no refund applies) | 'due' (salon owes the customer) | 'refunded' (salon has paid it back)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at TEXT;
CREATE INDEX IF NOT EXISTS ix_bookings_refund_due ON bookings(refund_status) WHERE refund_status = 'due';
