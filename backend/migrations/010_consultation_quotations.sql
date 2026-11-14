-- Consultation quotations: the salon replies to a consultation request with a price and a note.
-- Additive and idempotent. quoted_at is TEXT (ISO 8601) to match consultations.created_at.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS quotation_amount INTEGER
  CHECK (quotation_amount IS NULL OR quotation_amount > 0);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS quotation_note TEXT NOT NULL DEFAULT '';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS quoted_at TEXT;
