# Mycelium TODOs

---

## CURRENT: SessionDO Integration (In Progress)

**Goal:** Fix OAuth PKCE mismatch by using GroveAuth's SessionDO for inter-service auth instead of OAuth code exchange.

**Problem:** Claude.ai sends `code_challenge` to Mycelium, but Mycelium can't exchange the auth code with GroveAuth because only Claude has the `code_verifier`.

**Solution:** Internal Grove services (like Mycelium) receive session tokens directly instead of auth codes.

### Completed

#### GroveAuth Changes
- [x] Create migration `005_internal_services.sql` - adds `is_internal_service` column to clients table
- [x] Update `src/types.ts` - add `is_internal_service` to Client interface
- [x] Add `/session/validate-service` endpoint to `src/routes/session.ts`
- [x] Modify `src/routes/oauth/google.ts` - internal service redirect logic

#### Files Modified in GroveAuth
```
src/db/migrations/005_internal_services.sql  (NEW)
src/types.ts                                  (UPDATED)
src/routes/session.ts                         (UPDATED)
src/routes/oauth/google.ts                    (UPDATED)
```

### Remaining Tasks

#### GroveAuth (1 file)
- [ ] **Modify GitHub OAuth callback** - `src/routes/oauth/github.ts`
  - Import `createSessionCookie` from lib/session.js
  - Add internal service check after session creation (around line 193)
  - Add `buildInternalServiceRedirect` helper function
  - Same pattern as google.ts changes

#### Mycelium (2 files)
- [ ] **Update `src/auth/oauth-handlers.ts`**
  - Remove PKCE forwarding from `handleAuthorize()`
  - Replace code exchange with session token validation in `handleCallback()`
  - Call `/session/validate-service` endpoint
  - Parse `session_token`, `user_id`, `email` from callback URL

- [ ] **Update `src/types.ts`**
  - Change `accessToken` to `sessionToken` in AuthProps interface

#### Deployment
- [ ] **Deploy GroveAuth**
  ```bash
  cd /Users/autumn/Documents/Projects/GroveAuth
  npx wrangler d1 migrations apply groveauth --remote
  npx wrangler deploy
  ```

- [ ] **Update Mycelium client in GroveAuth DB**
  ```sql
  UPDATE clients SET is_internal_service = 1 WHERE client_id = 'mycelium';
  ```

- [ ] **Deploy Mycelium**
  ```bash
  cd /Users/autumn/Documents/Projects/Mycelium
  npx wrangler deploy
  ```

- [ ] **Test with Claude.ai MCP connector**

### Reference Code

#### handleCallback (Mycelium) - Target Implementation
```typescript
export async function handleCallback(
  request: Request,
  env: Env,
  completeAuth: CompleteAuthFn
): Promise<Response> {
  const url = new URL(request.url);

  // Session token flow (internal service)
  const sessionToken = url.searchParams.get("session_token");
  const userId = url.searchParams.get("user_id");
  const email = url.searchParams.get("email");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle errors...

  if (sessionToken && userId && email) {
    // Validate session with GroveAuth
    const validationRes = await fetch("https://auth-api.grove.place/session/validate-service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken }),
    });

    if (!validationRes.ok) {
      return new Response(
        JSON.stringify({ error: "session_invalid" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const state = JSON.parse(stateParam || "{}");

    // Complete OAuth grant for Claude.ai
    const { redirectTo } = await completeAuth({
      request: state.oauthReq,
      userId,
      metadata: { email },
      scope: state.oauthReq?.scope,
      props: { userId, email, tenants: [], sessionToken },
    });

    return Response.redirect(redirectTo, 302);
  }

  return new Response(
    JSON.stringify({ error: "invalid_callback" }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

### Plan File
Full implementation details at: `/Users/autumn/.claude/plans/dapper-humming-hellman.md`

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
- [ ] Test with Claude.ai Connectors (blocked by SessionDO integration - see CURRENT section)

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
