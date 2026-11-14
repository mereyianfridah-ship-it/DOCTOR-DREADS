-- Single-use password reset tokens. Only a SHA-256 hash of the token is stored, never the token itself.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user ON password_reset_tokens(user_id, created_at);

-- Sessions issued before this moment are rejected, so a reset signs out every existing session.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TEXT;
