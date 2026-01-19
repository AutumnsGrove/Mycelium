# Mycelium CLI-First Architecture Refactor: Phase 1 Audit

**Date:** January 2026
**Status:** Phase 1 Complete - Ready for Phase 2 Implementation
**Package:** `@groveengine/cli` (locked in)
**Language:** TypeScript (locked in)

---

## Executive Summary

This document contains the complete Phase 1 exploration and audit for refactoring Mycelium from an MCP-first architecture to a **CLI-first architecture** with MCP as a thin wrapper. All service repos have been cloned and thoroughly explored.

**Key Decisions (Locked In):**
- **Package name:** `@groveengine/cli` on npm
- **CLI command:** `grove` (e.g., `grove lattice posts list`)
- **Language:** TypeScript (aligns with all Grove Workers/APIs)
- **Auth storage:** System keychain (1st), env variable (2nd), config file (3rd)
- **Default tenant:** CLI remembers last-used tenant
- **Plugin system:** Scoped for future (Phase 3+)
- **Interactive mode:** Optional flag, not default

---

## 1. Service Catalog & Real Status

### Core Services (Priority 1)

| Service | Domain | Purpose | Actual Status | Notes |
|---------|--------|---------|---------------|-------|
| **Lattice** | `grove.place` | Core blog platform | **Active** | Basic API, needs expansion |
| **Heartwood** | `auth-api.grove.place` | Centralized authentication | **Active (Production)** | Full Better Auth, no CLI flow yet |
| **Amber** | `amber.grove.place` | Storage management (R2) | **95% Complete** | Worker done, no upload endpoint |
| **Rings** | *(integrated)* | Privacy-first analytics | **Planned** | Not active yet |
| **Bloom** | `bloom.grove.place` | Remote coding infrastructure | **Phase 4-5 Complete** | API + Dashboard done |
| **Meadow** | `meadow.grove.place` | Social feed & community | **Planned** | Not active yet |

### Extended Services (Priority 2)

| Service | Purpose | Actual Status |
|---------|---------|---------------|
| **Foliage** | Theme system & customization | **Complete npm package** (10 themes, 13 components) |
| **Reeds** | Comments system | Planned |
| **Vista** | Infrastructure monitoring | Planned |
| **Porch** | Support conversations | Planned |
| **Pantry** | Shop & merchandise | Planned |
| **Clearing** | Status page | Planned |

---

## 2. Detailed API Audit

### Heartwood (Authentication) - PRODUCTION DEPLOYED

**Repository:** `/home/user/GroveAuth`
**Tech Stack:** Cloudflare Workers + Hono + D1 + KV + Durable Objects + Better Auth

**Implemented Authentication Methods:**
- Google OAuth (primary)
- Discord OAuth
- Magic Links (6-digit email codes, 10-min expiry)
- Passkeys (WebAuthn)
- Two-Factor Authentication (TOTP)

**Current API Endpoints (Comprehensive):**
```
# Better Auth (New, Recommended)
POST /api/auth/sign-in/social              OAuth login
POST /api/auth/sign-in/magic-link          Magic link login
POST /api/auth/sign-in/passkey             Passkey login
GET  /api/auth/session                     Get current session
POST /api/auth/sign-out                    Sign out
POST /api/auth/passkey/*                   Passkey management (5 routes)
POST /api/auth/two-factor/*                TOTP management (4 routes)

# Legacy (Backwards Compatible)
GET  /oauth/google                         Initiate Google OAuth
POST /magic/send                           Send magic code email
POST /magic/verify                         Verify magic code
POST /token                                Exchange code for tokens
POST /token/refresh                        Refresh access token
GET  /userinfo                             Get current user info

# Session Management
GET  /session/list                         List all active sessions
POST /session/revoke                       Logout current device
POST /session/revoke-all                   Logout all devices
DELETE /session/:id                        Revoke specific session
```

**CRITICAL GAP: No CLI Auth Flow**

To add `grove login` (similar to Claude Code), need to implement:

1. **Device Code Flow Endpoints:**
   ```
   POST /auth/device-code                   Generate device_code + user_code
   POST /auth/device-code/verify            CLI polls for authorization
   ```

2. **Database Tables:**
   ```sql
   device_codes (device_code, user_code, status, expires_at)
   api_tokens (token_hash, user_id, scopes, revoked)
   ```

3. **Frontend UI:**
   - Page at `/auth/device?code=ABCD-1234` for user to confirm

4. **CLI Flow:**
   ```bash
   $ grove login
   Visit: https://auth-api.grove.place/auth/device?code=ABCD-1234
   Code: ABCD-1234
   Waiting for authorization...
   ✓ Logged in as autumn@grove.place
   ```

**Quality:** Excellent foundation. Production-deployed with Better Auth. Just needs device code flow for CLI.

---

### Lattice (Blogging Platform)

**Domain:** `grove.place`
**Current Status:** Basic API, needs significant expansion

**Current API (Basic):**
```
POST   /api/{tenant}/posts          Create post
GET    /api/{tenant}/posts          List posts
GET    /api/{tenant}/posts/{slug}   Get single post
PUT    /api/{tenant}/posts/{slug}   Update post
DELETE /api/{tenant}/posts/{slug}   Delete post
GET    /api/{tenant}/drafts         List drafts
```

**Required Expansions:**
```
# Post Management (CRUD+)
PATCH  /api/{tenant}/posts/{slug}   Partial update
POST   /api/{tenant}/posts/{slug}/publish    Publish draft
POST   /api/{tenant}/posts/{slug}/unpublish  Revert to draft
POST   /api/{tenant}/posts/{slug}/schedule   Schedule publication
GET    /api/{tenant}/posts/{slug}/revisions  Revision history
POST   /api/{tenant}/posts/{slug}/restore    Restore revision

# Media Management
POST   /api/{tenant}/media          Upload media
GET    /api/{tenant}/media          List media
DELETE /api/{tenant}/media/{id}     Delete media
POST   /api/{tenant}/media/{id}/optimize    Optimize image

# Content Organization
GET    /api/{tenant}/tags           List tags
POST   /api/{tenant}/tags           Create tag
GET    /api/{tenant}/categories     List categories
POST   /api/{tenant}/series         Create post series
GET    /api/{tenant}/series         List series

# Bulk Operations
POST   /api/{tenant}/posts/bulk     Bulk update/delete
POST   /api/{tenant}/export         Export posts (JSON/Markdown)
POST   /api/{tenant}/import         Import posts

# Statistics (ties into Rings)
GET    /api/{tenant}/stats          Site-wide stats
GET    /api/{tenant}/posts/{slug}/stats    Per-post stats
```

**Quality:** Foundation exists, but API is very basic. Needs verbose expansion for full CLI support.

---

### Amber (Storage) - 95% COMPLETE

**Repository:** `/home/user/Amber`
**Tech Stack:** Cloudflare Workers + D1 + R2 + Durable Objects

**Implemented API Endpoints:**
```
# Storage Info
GET    /api/storage                 Quota and usage breakdown
GET    /api/storage/files           Paginated file list (filters, sorting)
GET    /api/storage/files/:id       Single file metadata

# File Operations
DELETE /api/storage/files/:id       Move to trash
POST   /api/storage/files/:id/restore  Restore from trash
GET    /api/storage/trash           List trash files
DELETE /api/storage/trash           Empty all trash
DELETE /api/storage/trash/:id       Delete single trash file permanently

# Downloads
GET    /api/storage/download/:key   Download single file

# Export (Background Jobs via Durable Objects)
POST   /api/storage/export          Start export job
GET    /api/storage/export/:id      Get export status
GET    /api/storage/export/:id/download  Get download URL

# Storage Add-ons
GET    /api/storage/addons          List available/purchased add-ons
POST   /api/storage/addons          Purchase add-on (Stripe placeholder)
DELETE /api/storage/addons/:id      Cancel add-on
```

**CRITICAL GAP: No File Upload Endpoint**

```
# MISSING - Blocks CLI upload functionality
POST   /api/storage/files           Upload file (multipart/form-data)
POST   /api/storage/presign         Get presigned URL for direct upload
```

**Also Missing:**
- Presigned URLs for downloads (currently returns file content directly)
- Stripe integration (placeholder only)
- Heartwood auth integration (test mode works)

**Quality:** Structurally excellent. Worker is production-ready. Just needs upload endpoint and presigned URLs.

---

### Bloom (Remote Coding) - PHASES 4-5 COMPLETE

**Repository:** `/home/user/GroveBloom`
**Tech Stack:** Cloudflare Workers + Hono + D1 + R2 + Hetzner VPS

**Implemented API Endpoints:**
```
# Session Management
POST   /api/start                   Provision new VPS
POST   /api/stop                    Graceful shutdown
GET    /api/status                  Current session state

# Task Management
POST   /api/task                    Send autonomous task
POST   /api/sync                    Manual R2 sync trigger

# Configuration
GET    /api/projects                List configured repos
POST   /api/config                  Update settings

# History
GET    /api/history                 Session history + monthly summary

# Webhooks (VPS → Worker)
POST   /webhook/ready               VPS boot complete
POST   /webhook/heartbeat           Daemon idle report
POST   /webhook/task-complete       Task finished
POST   /webhook/idle-timeout        Graceful shutdown trigger
```

**Infrastructure:**
- Hetzner VPS provisioning with cloud-init
- Region support: EU (Falkenstein €0.008/hr), US (Ashburn €0.021/hr)
- ttyd web terminal
- bloom-daemon for idle detection
- R2 sync for node_modules and workspace

**Implementation Status:**
- ✅ Phase 4: Worker API (735 lines, fully functional)
- ✅ Phase 5: SvelteKit Dashboard (mobile-first)
- ⏳ Phases 1-3: Infrastructure setup (manual, needs credentials)
- ⏳ Phases 6-8: Testing and VPS script validation

**Quality:** Much more developed than expected. Core orchestration complete. Ready for CLI wrapper once infrastructure is set up.

---

### Foliage (Theming) - COMPLETE NPM PACKAGE

**Repository:** `/home/user/Foliage`
**Package:** `@autumnsgrove/foliage`
**Tech Stack:** SvelteKit library + D1 + R2

**Features:**
- 10 curated themes (Grove, Minimal, Night Garden, Zine, Moodboard, etc.)
- 13 Svelte 5 components with full reactivity
- Tier-based access control (Seedling → Sapling → Oak → Evergreen)
- WCAG 2.1 AA contrast validation
- Community theme marketplace
- Custom font uploads (Evergreen tier)
- 186 passing tests

**Server Functions Available:**
```typescript
// Theme Management
loadThemeSettings(db, tenantId)
saveThemeSettings(db, settings)
updateAccentColor(db, tenantId, color)
updateThemeId(db, tenantId, themeId)
resetThemeSettings(db, tenantId)

// Font Management (Evergreen tier)
uploadFont(r2, db, tenantId, buffer, metadata)
deleteFont(r2, db, tenantId, fontId)
listFonts(db, tenantId)

// Community Themes
createCommunityTheme(db, theme)
listCommunityThemes(db, options)
getApprovedThemes(db, limit, offset)
```

**Quality:** Production-ready npm package. Just needs CLI commands added to Mycelium.

---

### Rings (Analytics) - PLANNED

Not active yet. Spec exists but no implementation.

### Meadow (Social) - PLANNED

Not active yet. Spec exists but no implementation.

---

## 3. grove-find Analysis: CLI-First + Agent Mode Pattern

**Location:** `/home/user/groveengine/scripts/repo/grove-find.sh`

### Key Pattern Elements

#### 1. CLI-First Functions
```bash
gf "pattern"        # General search
gfc "ClassName"     # Find class/component
gff "function"      # Find function definition
gfi "module"        # Find imports
```

#### 2. Agent Mode via Environment Variable
```bash
if [ -n "$GF_AGENT" ]; then
    RED="" GREEN="" YELLOW="" BLUE="" PURPLE="" CYAN="" NC=""
fi
```

#### 3. Condensed Agent Reference
```bash
gfagent() {
    if [ -z "$GF_AGENT" ]; then
        # Decorated output for humans
    else
        # Plain output for agents
    fi
}
```

### Applying to Grove CLI

```bash
# Human mode (default)
$ grove lattice posts list
┌────────────────────────────────────────┐
│ Posts (3 total)                        │
├────────────────────────────────────────┤
│ my-first-post    published   Jan 15    │
│ draft-post       draft       Jan 14    │
│ another-post     published   Jan 10    │
└────────────────────────────────────────┘

# Agent mode (clean JSON)
$ GROVE_AGENT=1 grove lattice posts list
{"posts":[{"slug":"my-first-post","status":"published"...}]}

# Or with --json flag
$ grove lattice posts list --json
```

---

## 4. Package Name Availability (LOCKED IN)

**Decision: `@groveengine/cli`**

| Package | npm | PyPI | Status |
|---------|-----|------|--------|
| `grove` | Taken | Taken (HashiCorp) | ❌ |
| `grove-cli` | Taken | Unknown | ❌ |
| `mycelium` | Unpublished | Taken | ⚠️ |
| **`@groveengine/cli`** | **Available** | - | ✅ **CHOSEN** |

The CLI command will still be `grove` via package.json bin configuration:
```json
{
  "name": "@groveengine/cli",
  "bin": {
    "grove": "./dist/cli/index.js"
  }
}
```

---

## 5. Language Recommendation (LOCKED IN)

**Decision: TypeScript**

**Rationale:**
1. All Grove Workers/APIs are TypeScript
2. Shared service clients between CLI and MCP
3. Single language for entire Cloudflare stack
4. Type-safe API interactions
5. Native integration with existing codebase

---

## 6. Auth Flow Design

### `grove login` Flow (Like Claude Code)

```
┌────────────────────────────────────────────────────────────────┐
│                        grove login                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  $ grove login                                                  │
│                                                                 │
│  Opening browser...                                             │
│  Or visit: https://auth-api.grove.place/auth/device?code=ABCD  │
│  Code: ABCD-1234                                                │
│                                                                 │
│  Waiting for authorization... ⣾                                 │
│                                                                 │
│  ✓ Logged in as autumn@grove.place                             │
│  Tenant: autumns-grove                                          │
│  Token saved to system keychain                                 │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Token Storage Priority

1. **System keychain** (macOS Keychain, Windows Credential Manager, Linux Secret Service)
2. **Environment variable** (`GROVE_TOKEN`)
3. **Config file** (`~/.grove/credentials.json`) - fallback

### Admin vs. Regular User

**Admin (Wayfinder/Pathfinder):**
```bash
$ grove config tenant autumns-grove   # Switch tenant
$ grove config tenant maple-grove     # Work on another tenant
$ grove lattice posts list            # Lists for current tenant
```

**Regular User:**
- CLI remembers their single tenant
- No tenant switching (locked to their account)

---

## 7. Open Questions Answered

| Question | Decision |
|----------|----------|
| Auth storage | Keychain → env var → config file |
| Default tenant | CLI remembers last-used |
| Offline mode | No |
| Plugins | Yes, scoped for future (Phase 3+) |
| Interactive mode | Optional flag, not default |

---

## 8. Comprehensive TODO List for Phase 2

### Critical Path (MVP)

#### Heartwood: Device Code Auth
- [ ] Add `device_codes` table to D1 schema
- [ ] Add `api_tokens` table for CLI tokens
- [ ] Implement `POST /auth/device-code` endpoint
- [ ] Implement `POST /auth/device-code/verify` (polling endpoint)
- [ ] Build device authorization UI at `/auth/device`
- [ ] Add token refresh handling for CLI

#### Amber: File Upload
- [ ] Implement `POST /api/storage/files` (multipart upload)
- [ ] Add file size validation (max 100MB)
- [ ] Add MIME type validation
- [ ] Implement presigned URL generation for downloads
- [ ] Complete Heartwood auth integration

#### Lattice: API Expansion
- [ ] Add `PATCH /api/{tenant}/posts/{slug}` for partial updates
- [ ] Add publish/unpublish/schedule endpoints
- [ ] Add media upload endpoint
- [ ] Add tags/categories endpoints
- [ ] Add bulk operations endpoint
- [ ] Add export/import endpoints

### CLI Framework Setup

- [ ] Initialize `@groveengine/cli` package
- [ ] Set up Commander.js or oclif
- [ ] Implement `--json` output flag
- [ ] Implement `GROVE_AGENT=1` environment variable
- [ ] Add `grove --version` and `grove --help`

### Core CLI Commands

#### Authentication (`grove auth`)
- [ ] `grove login` - Device code auth flow
- [ ] `grove logout` - Revoke token
- [ ] `grove whoami` - Show current user
- [ ] `grove auth status` - Show auth state
- [ ] System keychain integration

#### Configuration (`grove config`)
- [ ] `grove config init` - Interactive setup
- [ ] `grove config tenant [name]` - Get/set tenant
- [ ] `grove config list` - Show all config
- [ ] Config file at `~/.grove/config.json`

#### Lattice Commands (`grove lattice`)
- [ ] `grove lattice posts list [--status] [--limit]`
- [ ] `grove lattice posts get <slug>`
- [ ] `grove lattice posts create --title <title> [--content] [--status]`
- [ ] `grove lattice posts update <slug> [--title] [--content] [--status]`
- [ ] `grove lattice posts delete <slug>`
- [ ] `grove lattice posts publish <slug>`
- [ ] `grove lattice posts unpublish <slug>`
- [ ] `grove lattice drafts`
- [ ] `grove lattice media upload <file>`
- [ ] `grove lattice media list`

#### Amber Commands (`grove amber`)
- [ ] `grove amber upload <file> [--path]`
- [ ] `grove amber download <key> [--output]`
- [ ] `grove amber list [--prefix] [--limit]`
- [ ] `grove amber delete <key>`
- [ ] `grove amber trash`
- [ ] `grove amber trash --empty`
- [ ] `grove amber quota`
- [ ] `grove amber export [--type full|blog|ivy]`

#### Bloom Commands (`grove bloom`)
- [ ] `grove bloom start [--region eu|us] [--project]`
- [ ] `grove bloom status`
- [ ] `grove bloom stop`
- [ ] `grove bloom task <description>`
- [ ] `grove bloom logs [--follow]`
- [ ] `grove bloom history`

#### Foliage Commands (`grove foliage`)
- [ ] `grove foliage list-themes [--tier]`
- [ ] `grove foliage info <theme-id>`
- [ ] `grove foliage set-theme <theme-id>`
- [ ] `grove foliage set-accent <color>`
- [ ] `grove foliage current`
- [ ] `grove foliage community list`
- [ ] `grove foliage community browse` (interactive)

### Shared Service Clients

- [ ] Create `core/services/heartwood.ts` (auth client)
- [ ] Create `core/services/lattice.ts` (blog client)
- [ ] Create `core/services/amber.ts` (storage client)
- [ ] Create `core/services/bloom.ts` (VPS client)
- [ ] Create `core/services/foliage.ts` (theming client)
- [ ] Create `core/types.ts` (shared types)

### MCP Server Refactor

- [ ] Refactor MCP tools to use shared service clients
- [ ] Maintain session state (active tenant, project)
- [ ] Map CLI commands → MCP tools

### Future Phases (Scoped)

#### Phase 3: Extended Services
- [ ] Add Rings commands (when API is ready)
- [ ] Add Meadow commands (when API is ready)
- [ ] Add Reeds commands (when API is ready)

#### Phase 3+: Plugin System
- [ ] Plugin discovery mechanism
- [ ] Plugin installation (`grove plugins install`)
- [ ] Plugin API for third-party extensions

---

## 9. Target Architecture

```
mycelium/
├── cli/
│   ├── commands/
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   └── whoami.ts
│   │   ├── config/
│   │   │   ├── init.ts
│   │   │   ├── tenant.ts
│   │   │   └── list.ts
│   │   ├── lattice/
│   │   │   ├── posts.ts
│   │   │   ├── media.ts
│   │   │   └── index.ts
│   │   ├── amber/
│   │   │   ├── upload.ts
│   │   │   ├── download.ts
│   │   │   ├── list.ts
│   │   │   └── index.ts
│   │   ├── bloom/
│   │   │   ├── start.ts
│   │   │   ├── stop.ts
│   │   │   ├── status.ts
│   │   │   └── index.ts
│   │   └── foliage/
│   │       ├── list-themes.ts
│   │       ├── set-theme.ts
│   │       └── index.ts
│   ├── utils/
│   │   ├── output.ts        # JSON/table formatting
│   │   ├── auth.ts          # Keychain + token handling
│   │   └── config.ts        # Config file management
│   └── index.ts             # CLI entry point
├── mcp/
│   ├── server.ts            # McpAgent wrapper
│   └── tools.ts             # Tool definitions → CLI commands
├── core/
│   ├── services/
│   │   ├── heartwood.ts     # Auth client
│   │   ├── lattice.ts       # Blog client
│   │   ├── amber.ts         # Storage client
│   │   ├── bloom.ts         # VPS client
│   │   └── foliage.ts       # Theme client
│   ├── types.ts             # Shared type definitions
│   └── config.ts            # Configuration management
├── package.json
├── tsconfig.json
└── README.md
```

---

## 10. Migration Strategy

### Step 1: Create Shared Service Clients
Extract API interaction logic into `core/services/`:
```typescript
// core/services/lattice.ts
export class LatticeClient {
  constructor(private token: string, private tenant: string) {}

  async listPosts(options?: ListPostsOptions): Promise<Post[]> {
    const response = await fetch(`https://grove.place/api/${this.tenant}/posts`);
    return response.json();
  }

  async createPost(data: CreatePostData): Promise<Post> { ... }
  async updatePost(slug: string, data: UpdatePostData): Promise<Post> { ... }
  async deletePost(slug: string): Promise<void> { ... }
}
```

### Step 2: Build CLI Layer
```typescript
// cli/commands/lattice/posts.ts
import { LatticeClient } from '../../core/services/lattice';
import { getAuthToken, getTenant } from '../../utils/auth';

export const listPostsCommand = new Command('list')
  .option('--status <status>')
  .option('--limit <n>')
  .option('--json')
  .action(async (options) => {
    const client = new LatticeClient(await getAuthToken(), getTenant());
    const posts = await client.listPosts(options);

    if (options.json || process.env.GROVE_AGENT) {
      console.log(JSON.stringify(posts));
    } else {
      printPostsTable(posts);
    }
  });
```

### Step 3: Refactor MCP Server
```typescript
// mcp/tools.ts
import { LatticeClient } from '../core/services/lattice';

export function registerLatticeTools(server: McpServer, auth: AuthProps) {
  const client = new LatticeClient(auth.sessionToken, state.activeTenant);

  server.tool("lattice_posts_list", schema, async (params) => {
    const posts = await client.listPosts(params);
    return formatMcpResponse(posts);
  });
}
```

---

## Conclusion

Phase 1 is complete with comprehensive exploration of all key Grove services:

- **Heartwood:** Production-ready auth, needs device code flow for CLI
- **Amber:** 95% complete Worker, needs upload endpoint
- **Bloom:** More developed than expected, API + Dashboard done
- **Foliage:** Complete npm package, ready for CLI commands
- **Lattice:** Basic API, needs significant expansion

**Locked In Decisions:**
- Package: `@groveengine/cli`
- Language: TypeScript
- Auth: Keychain → env → config file

**Next Steps:**
1. Implement device code auth in Heartwood
2. Add file upload endpoint to Amber
3. Set up CLI framework with Commander.js
4. Build shared service clients
5. Implement core CLI commands
6. Refactor MCP server to use shared clients

**Recommended PR Order:**
1. PR 1: Device code auth in Heartwood
2. PR 2: File upload in Amber
3. PR 3: CLI framework + auth commands
4. PR 4: Lattice commands
5. PR 5: Amber commands
6. PR 6: Bloom commands
7. PR 7: Foliage commands
8. PR 8: MCP refactor
