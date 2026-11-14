-- Customer response to a consultation quotation (accepted / declined). Additive and idempotent.
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS quotation_response TEXT
  CHECK (quotation_response IS NULL OR quotation_response IN ('accepted','declined'));
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS quotation_responded_at TEXT;
