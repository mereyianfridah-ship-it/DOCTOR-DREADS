-- Internal staff notes on consultation requests. Never exposed to customers.
CREATE TABLE IF NOT EXISTS consultation_notes (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_consultation_notes_consultation ON consultation_notes(consultation_id, id);
