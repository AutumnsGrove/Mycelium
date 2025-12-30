# Mycelium TODOs

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
- [ ] Install dependencies (`pnpm install`)
- [ ] Create Cloudflare KV namespace
- [ ] Configure Heartwood OAuth client
- [ ] Set secrets via wrangler

### Core Implementation
- [ ] Implement basic McpAgent setup in index.ts
- [ ] Implement Heartwood OAuth flow (auth/heartwood.ts)
  - [ ] /authorize redirect
  - [ ] /callback token exchange
  - [ ] /token refresh
- [ ] Implement session state persistence
- [ ] Run SQL migrations on DO init

### Tools - Lattice (Blog)
- [ ] `lattice_posts_list` - List posts with filtering
- [ ] `lattice_post_get` - Get single post by slug
- [ ] `lattice_post_create` - Create new post
- [ ] `lattice_post_update` - Update existing post
- [ ] `lattice_post_delete` - Delete post
- [ ] `lattice_drafts` - List user's drafts

### Tools - Context (Session)
- [ ] `mycelium_context` - Return session state
- [ ] `mycelium_set_tenant` - Set active tenant
- [ ] `mycelium_set_project` - Set active project
- [ ] `mycelium_preferences` - Update preferences
- [ ] `mycelium_history` - Get task history

### Testing & Deployment
- [ ] Write unit tests for auth flow
- [ ] Write unit tests for Lattice tools
- [ ] Test with MCP Inspector locally
- [ ] Deploy to mycelium.grove.place
- [ ] Test with Claude.ai Connectors

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
