# Mycelium TODOs

---

## SessionDO Integration (Complete - 2025-01-02)

**Goal:** Fixed OAuth PKCE mismatch by using GroveAuth's SessionDO for inter-service auth instead of OAuth code exchange.

**Problem:** Claude.ai sent `code_challenge` to Mycelium, but Mycelium couldn't exchange the auth code with GroveAuth because only Claude had the `code_verifier`.

**Solution:** Internal Grove services (like Mycelium) now receive session tokens directly instead of auth codes.

### All Tasks Completed

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
- [ ] Test with Claude.ai MCP connector (ready for testing)

### Files Modified

**GroveAuth:**
```
src/db/migrations/005_internal_services.sql  (NEW)
src/types.ts                                  (UPDATED)
src/routes/session.ts                         (UPDATED)
src/routes/oauth/google.ts                    (UPDATED)
src/routes/oauth/github.ts                    (UPDATED)
```

**Mycelium:**
```
src/auth/oauth-handlers.ts                    (REWRITTEN)
src/types.ts                                  (UPDATED)
src/tools/lattice.ts                          (UPDATED)
```

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
