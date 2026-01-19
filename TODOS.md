# Mycelium TODOs

---

## Better Auth Migration (Complete - 2026-01-07)

**Goal:** Migrate from Heartwood legacy token-based auth to Better Auth session-based auth.

**Benefits:**
- KV-cached sessions with sub-100ms validation
- Cross-subdomain SSO on `.grove.place`
- Cookie-based sessions (no token management needed)
- Simpler auth flow

### All Tasks Completed ✅

#### Auth Handler Changes
- [x] Update `handleAuthorize` to redirect to Better Auth `/api/auth/sign-in/{provider}`
- [x] Update `handleCallback` to use `/api/auth/session` for session validation
- [x] Remove legacy Heartwood OAuth code exchange logic
- [x] Use base64-encoded state for OAuth request preservation

#### Helper Functions
- [x] Rewrite `heartwood.ts` as Better Auth helpers:
  - `validateSessionToken()` - validate session with Better Auth
  - `getSessionFromCookie()` - get session from cookie header
  - `isSessionExpired()` - check session expiry
  - `signOut()` - invalidate session
  - `getGoogleSignInUrl()` / `getGitHubSignInUrl()` - build auth URLs

#### Type Updates
- [x] Remove `scopes` from `AuthProps` (Better Auth doesn't use OAuth scopes)
- [x] Keep `sessionToken` for tool authentication

#### Tests
- [x] Rewrite auth tests for Better Auth flow
- [x] Test session validation helpers
- [x] Test OAuth handler redirects and callbacks

### Files Modified

```
src/auth/oauth-handlers.ts    (REWRITTEN - Better Auth integration)
src/auth/heartwood.ts         (REWRITTEN - Better Auth helpers)
src/types.ts                  (UPDATED - removed scopes from AuthProps)
tests/auth.test.ts            (REWRITTEN - Better Auth tests)
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/sign-in/google` | GET | Start Google OAuth |
| `/api/auth/sign-in/github` | GET | Start GitHub OAuth |
| `/api/auth/session` | GET | Get current session + user |
| `/api/auth/sign-out` | POST | End session |

All endpoints on `https://auth-api.grove.place`.

---

## SessionDO Integration (Complete - 2025-01-02)

**Goal:** Fixed OAuth PKCE mismatch by using GroveAuth's SessionDO for inter-service auth instead of OAuth code exchange.

**Problem:** Claude.ai sent `code_challenge` to Mycelium, but Mycelium couldn't exchange the auth code with GroveAuth because only Claude had the `code_verifier`.

**Solution:** Internal Grove services (like Mycelium) now receive session tokens directly instead of auth codes.

**Note:** This has been superseded by the Better Auth migration above.

### All Tasks Completed ✅

#### GroveAuth Changes
- [x] Create migration `005_internal_services.sql` - adds `is_internal_service` column to clients table
- [x] Update `src/types.ts` - add `is_internal_service` to Client interface
- [x] Add `/session/validate-service` endpoint to `src/routes/session.ts`
- [x] Modify `src/routes/oauth/google.ts` - internal service redirect logic
- [x] Modify `src/routes/oauth/github.ts` - internal service redirect logic

#### Mycelium Changes
- [x] Update `src/auth/oauth-handlers.ts` - session token validation flow
- [x] Update `src/types.ts` - changed `accessToken` to `sessionToken` in AuthProps
- [x] Update `src/tools/lattice.ts` - use `sessionToken` for auth headers

#### Deployment
- [x] Run migration on GroveAuth D1 (added `is_internal_service` column)
- [x] Mark Mycelium as internal service in DB
- [x] Deploy GroveAuth (v df2a1ebc-141b-4ad2-a71e-96bc0d2de058)
- [x] Deploy Mycelium (v 8dd28589-4e44-4992-832d-182a5b0c35de)

---

## CURRENT: Grove CLI Device Code Auth (In Progress - 2026-01-19)

**Goal:** Implement RFC 8628 Device Authorization Grant for `grove login` command, enabling browser-based authentication without manual token entry.

**Flow:**
1. CLI requests device code from Heartwood → receives `user_code` + `device_code`
2. CLI displays code and opens browser to verification URL
3. User authenticates with Google OAuth, sees the code, approves
4. CLI polls until approved → receives access token
5. Token saved to system keychain

### Completed Today ✅

#### Mycelium (CLI) Side
- [x] Added RFC 8628 types to `core/types.ts` (DeviceCodeResponse, TokenResponse, DeviceCodeError)
- [x] Added `requestDeviceCode()` method to HeartWoodClient
- [x] Added `pollDeviceCode()` method to HeartWoodClient
- [x] Implemented full device code flow in `cli/commands/auth/index.ts`
- [x] Added `open` package for cross-platform browser opening
- [x] Created mock server at `tests/mocks/heartwood-mock.ts`
- [x] Created device code tests at `tests/device-code.test.ts` (10 tests passing)
- [x] Fixed TypeScript build errors (unused `ctx`, `Mycelium.mount()` type issue)

#### GroveAuth (Heartwood) Side
- [x] Created migration `008_grove_cli_client.sql` to register `grove-cli` as OAuth client
- [x] Set `is_internal_service=1` so Google OAuth sets session cookie (not OAuth code)
- [x] Fixed `SameSite=Strict` → `SameSite=Lax` in `src/lib/session.ts` for OAuth redirects
- [x] Fixed user_code preservation through OAuth redirect in `src/routes/device.ts`
- [x] **Fixed session mismatch:** Updated device page to use `grove_session` cookie instead of Better Auth session

#### Key Discovery: Two Session Systems
- **Better Auth** uses `better-auth.session_token` cookie
- **Google OAuth flow** creates `grove_session` cookie (custom SessionDO)
- Device page was checking wrong cookie → infinite login loop
- Fixed by using `getSessionFromRequest()` from `lib/session.ts`

### Remaining Tasks

- [ ] Wire up `grove login` command in CLI (command exists but not registered)
- [ ] Test full end-to-end flow (CLI → browser → approval → token saved)
- [ ] Implement `grove logout` command
- [ ] Implement `grove whoami` command
- [ ] Add token refresh logic

### Files Modified

**Mycelium:**
```
core/types.ts                    (added device code types)
core/services/heartwood.ts       (added requestDeviceCode, pollDeviceCode)
cli/commands/auth/index.ts       (implemented device code flow)
tests/mocks/heartwood-mock.ts    (new - mock server)
tests/device-code.test.ts        (new - 10 tests)
```

**GroveAuth:**
```
src/db/migrations/008_grove_cli_client.sql  (new - register grove-cli)
src/lib/session.ts                          (SameSite=Lax fix)
src/routes/device.ts                        (grove_session cookie, user_code preservation)
```

### Deployment Status
- GroveAuth: Deployed (v 54db9b65-8644-4357-8554-9f5b2703867a)
- Mycelium CLI: Built but login command not wired up yet

---

## MCP Routing (In Progress - 2025-01-03)

**Goal:** Fix MCP connection by using proper McpAgent.mount() pattern.

**Problem History:**
1. ❌ Direct `stub.fetch()` → "Missing namespace or room headers"
2. ❌ `routeAgentRequest()` → "TypeError: Promise did not resolve to Response"
3. ❌ `Mycelium.mount("/sse")` → "Could not find McpAgent binding for MCP_OBJECT"

**Root Cause:** `McpAgent.mount()` expects a Durable Object binding named `MCP_OBJECT` but we have `MYCELIUM_DO` in wrangler.jsonc.

**Research Findings:** (via web-research-specialist agent)
- ✅ Correct pattern: Use `apiHandler: Mycelium.mount('/sse')` NOT `routeAgentRequest()`
- ✅ OAuthProvider supports this with `apiHandler` parameter
- ⚠️ `mount()` looks for DO binding named `MCP_OBJECT` by default
- 📚 Reference: https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/

### Progress

#### Status
- ✅ OAuth flow working perfectly (session token validation successful)
- ✅ Token exchange working (completeAuth returns auth code to Claude)
- ✅ `/sse` POST and GET requests reaching worker
- ⏳ MCP binding name mismatch

#### Changes Made
- [x] Research proper integration pattern (Mycelium.mount() not routeAgentRequest)
- [x] Simplify index.ts - remove apiHandler wrapper, use mount() directly
- [x] Update OAuthProvider config to use `apiHandler: Mycelium.mount("/sse")`
- [ ] Fix DO binding name (MYCELIUM_DO → MCP_OBJECT or configure mount())

#### Files Modified
```
src/index.ts  (UPDATED - using Mycelium.mount() pattern)
```

### Current Deployment Versions
- GroveAuth: `df2a1ebc-141b-4ad2-a71e-96bc0d2de058`
- Mycelium (current): `10ea48fa-a418-4c4b-9580-922f45294598` (with mount())

### Next Steps (When Resuming)
1. Check if `mount()` accepts binding name parameter, or
2. Rename `MYCELIUM_DO` to `MCP_OBJECT` in wrangler.jsonc, or
3. Find alternate mount configuration

### Latest Log Findings
From logs (12:32:13 PM):
- OAuth: ✅ Working
- Session validation: ✅ Working
- Token exchange: ✅ Working
- SSE POST: ✅ Reaching worker
- SSE GET: ✅ Reaching worker
- MCP binding: ❌ `Error: Could not find McpAgent binding for MCP_OBJECT`

**Key Insight:** We're SO close! The mount() pattern is correct, just needs the right binding name.

---

## Phase 0: Scaffolding (Complete)

- [x] Create project structure (src/, docs/, tests/)
- [x] Set up configuration (wrangler.jsonc, package.json, tsconfig.json)
- [x] Define types (src/types.ts)
- [x] Create main entry point stub (src/index.ts)
- [x] Create tool stubs for all 7 groups
- [x] Create auth handler stub
- [x] Create state management stubs
- [x] Update documentation (README.md, AGENT.md)

---

## Phase 1: Foundation (MVP)

### Setup
- [x] Install dependencies (`pnpm install`)
- [x] Create Cloudflare D1 database (replaced KV)
- [x] Create KV namespace for OAuth provider
- [x] Configure Heartwood OAuth client (registered in GroveAuth)
- [x] Set secrets via wrangler (GROVEAUTH_CLIENT_ID, GROVEAUTH_CLIENT_SECRET, etc.)

### Core Implementation
- [x] Implement basic McpAgent setup in index.ts
- [x] Implement Heartwood OAuth flow (auth/heartwood.ts)
  - [x] /authorize redirect
  - [x] /callback token exchange
  - [x] /token refresh
- [x] Implement session state persistence
- [x] Run SQL migrations on DO init

### Tools - Lattice (Blog)
- [x] `lattice_posts_list` - List posts with filtering
- [x] `lattice_post_get` - Get single post by slug
- [x] `lattice_post_create` - Create new post
- [x] `lattice_post_update` - Update existing post
- [x] `lattice_post_delete` - Delete post
- [x] `lattice_drafts` - List user's drafts

### Tools - Context (Session)
- [x] `mycelium_context` - Return session state
- [x] `mycelium_set_tenant` - Set active tenant
- [x] `mycelium_set_project` - Set active project
- [x] `mycelium_preferences` - Update preferences
- [x] `mycelium_history` - Get task history

### Testing & Deployment
- [ ] Write unit tests for auth flow
- [ ] Write unit tests for Lattice tools
- [x] Test with local dev server (`pnpm dev`)
- [x] Deploy to mycelium.grove.place (deployed with OAuthProvider)
- [x] OAuth metadata endpoint working (`/.well-known/oauth-authorization-server`)
- [ ] Test with Claude.ai Connectors (SessionDO integration complete - ready for testing)

---

## Phase 2: Bloom Integration

### Tools - Bloom (Remote Dev)
- [ ] `bloom_session_start` - Start coding session
- [ ] `bloom_session_status` - Get session status
- [ ] `bloom_session_stop` - Stop session
- [ ] `bloom_task_submit` - Submit task to running session
- [ ] `bloom_logs` - Get session logs

### Features
- [ ] Task history tracking in SQLite
- [ ] Webhook support for task completion
- [ ] Active project state management

### Testing
- [ ] Integration tests with Bloom API
- [ ] E2E test: start session -> submit task -> get logs

---

## Phase 3: Full Ecosystem

### Tools - Amber (Storage)
- [ ] `amber_upload` - Upload file to R2
- [ ] `amber_download` - Download file
- [ ] `amber_list` - List files in path
- [ ] `amber_delete` - Delete file
- [ ] `amber_presign` - Get presigned URL

### Tools - Rings (Analytics)
- [ ] `rings_query` - Query analytics data
- [ ] `rings_events` - Get recent events
- [ ] `rings_dashboard` - Get dashboard summary

### Tools - Meadow (Social)
- [ ] `meadow_post` - Create social post
- [ ] `meadow_feed` - Get user's feed
- [ ] `meadow_following` - List following
- [ ] `meadow_followers` - List followers

### Tools - Scout (Deals)
- [ ] `scout_search` - Search for deals
- [ ] `scout_track` - Track item for price drops
- [ ] `scout_alerts` - Get price alerts

---

## Phase 4: Advanced Features

- [ ] Multi-tenant tool scoping
- [ ] Usage analytics via Rings
- [ ] Rate limiting per user
- [ ] Tool recommendations based on context
- [ ] Caching layer for API responses
- [ ] Audit logging for all tool calls

---

## Documentation

- [ ] Add API documentation for each tool
- [ ] Document OAuth scopes and permissions
- [ ] Add troubleshooting guide
- [ ] Create example interactions

---

## Infrastructure

- [ ] Set up CI/CD with GitHub Actions
- [ ] Add automated testing on PR
- [ ] Configure staging environment
- [ ] Set up error monitoring (Sentry?)
