# Heartwood: Add Device Code Auth Flow for Grove CLI

## Context

Grove is building a CLI (`@groveengine/cli`) that needs to authenticate users. The pattern to follow is the OAuth 2.0 Device Authorization Grant (RFC 8628), similar to how Claude Code handles CLI authentication.

Heartwood already has production-deployed auth with Better Auth (Google, Discord OAuth, magic links, passkeys, 2FA). We need to add device code flow endpoints.

## Requirements

### New API Endpoints

```
POST /auth/device-code
  Request: { client_id, scope }
  Response: {
    device_code: "random-uuid",
    user_code: "ABCD-1234",
    verification_uri: "https://auth-api.grove.place/auth/device",
    expires_in: 900,
    interval: 5
  }

POST /auth/device-code/poll
  Request: { device_code, client_id }
  Response (pending): { error: "authorization_pending" }
  Response (success): { access_token, refresh_token, token_type, expires_in }
  Response (expired): { error: "expired_token" }
  Response (denied): { error: "access_denied" }
```

### New D1 Tables

```sql
-- Device code requests (short-lived, 15 min TTL)
CREATE TABLE device_codes (
  device_code TEXT PRIMARY KEY,
  user_code TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  scope TEXT,
  status TEXT DEFAULT 'pending', -- pending, authorized, denied, expired
  user_id TEXT, -- populated when authorized
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Long-lived API tokens for CLI (issued after device auth)
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  client_id TEXT,
  scope TEXT,
  name TEXT DEFAULT 'CLI Token',
  last_used_at INTEGER,
  revoked INTEGER DEFAULT 0,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);
```

### Frontend UI

Add a page at `/auth/device` that:
1. Shows the user code prominently
2. Asks user to confirm authorization
3. Shows which CLI is requesting access
4. Has Approve/Deny buttons
5. Updates device_codes table on user action

### CLI Flow (What the CLI Will Do)

```bash
$ grove login
Opening browser...
Or visit: https://auth-api.grove.place/auth/device?code=ABCD-1234
Code: ABCD-1234

Waiting for authorization... ⣾

✓ Logged in as autumn@grove.place
Token saved to system keychain
```

## Implementation Notes

- User codes should be short and readable (e.g., "ABCD-1234" or "WARM-TREE")
- Device codes are long random UUIDs (not shown to user)
- Poll interval should be 5 seconds
- Expiry should be 15 minutes
- Clean up expired device codes via scheduled worker or on-read

## Success Criteria

- [ ] `POST /auth/device-code` generates codes
- [ ] `POST /auth/device-code/poll` returns appropriate status
- [ ] `/auth/device` UI allows user to authorize
- [ ] Successful auth returns valid access_token
- [ ] Token can be used with existing `/api/auth/session` endpoint
