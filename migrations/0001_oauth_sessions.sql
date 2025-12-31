-- D1 Migration: OAuth Sessions Table
-- This table stores OAuth session data for authenticated users

CREATE TABLE IF NOT EXISTS oauth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  tenants TEXT,           -- JSON array of tenant subdomains
  scopes TEXT,            -- JSON array of OAuth scopes
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Index for looking up sessions by user
CREATE INDEX IF NOT EXISTS idx_sessions_user ON oauth_sessions(user_id);

-- Index for cleaning up expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON oauth_sessions(expires_at);
