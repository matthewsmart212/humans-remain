-- Secure, revocable-by-expiry owner sessions created only after Cloudflare Access
-- verifies the configured game owner's email. The browser never sees the hash.
CREATE TABLE IF NOT EXISTS owner_editor_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS owner_editor_sessions_expires_at_idx
  ON owner_editor_sessions(expires_at);
