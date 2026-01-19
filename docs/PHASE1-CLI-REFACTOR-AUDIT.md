# Mycelium CLI-First Architecture Refactor: Phase 1 Audit

**Date:** January 2026
**Status:** Phase 1 Complete - Ready for Phase 2 Implementation

---

## Executive Summary

This document contains the complete Phase 1 exploration and audit for refactoring Mycelium from an MCP-first architecture to a **CLI-first architecture** with MCP as a thin wrapper. The deliverables include:

1. Service catalog of all Grove services
2. API audit for each service (current state, gaps, quality)
3. Analysis of the `grove-find` CLI-first + agent mode pattern
4. Comprehensive TODO list for Phase 2 implementation
5. Language recommendation (TypeScript vs Python)
6. Package name availability research

---

## 1. Service Catalog

### Core Services (Priority 1 - Already in Mycelium)

| Service | Public Name | Domain | Purpose | Status |
|---------|-------------|--------|---------|--------|
| **Lattice** | Lattice | lattice.grove.place | Core blog platform/framework | **Active** |
| **Heartwood** | Heartwood | heartwood.grove.place | Centralized authentication | **Active** |
| **Amber** | Amber | amber.grove.place | Storage management (R2) | **Active** |
| **Rings** | Rings | rings.grove.place | Privacy-first analytics | **Active** |
| **Bloom** | Bloom | bloom.grove.place | Remote coding infrastructure | **Planned** |
| **Meadow** | Meadow | meadow.grove.place | Social feed & community | **Planned** |

### Extended Services (Priority 2 - Future Integration)

| Service | Public Name | Purpose | Status |
|---------|-------------|---------|--------|
| **Reeds** | Reeds | Comments system | Active |
| **Foliage** | Foliage | Theme system & customization | Active |
| **Vista** | Vista | Infrastructure monitoring | Active |
| **Clearing** | Clearing | Data export & migration | Active |
| **Press** | Press | Image processing CLI | Active |
| **Shutter** | Shutter | Web content distillation | New |
| **Porch** | Porch | Support conversations | New |
| **Pantry** | Pantry | Shop & merchandise | New |

### Tertiary Services (Priority 3 - When Ready)

| Service | Purpose | Status |
|---------|---------|--------|
| **Plant** | Tenant onboarding | Planned |
| **Forage** | AI domain discovery | Active |
| **Ivy** | Grove mail client | Planned |
| **Loam** | Username protection | Active |
| **Wisp** | Writing assistant | Planned |
| **Waystone** | Help center | Planned |
| **Forests** | Community aggregators | New |
| **Wander** | Grove discovery | New |
| **Trails** | Personal roadmaps | Planned |
| **Thorn** | Security scanning | Planned |
| **Patina** | Backup & recovery | Active |
| **Shade** | AI content protection | Active |

---

## 2. API Audit

### Lattice (Blogging Platform)

**Current API Endpoints:**
```
POST   /api/{tenant}/posts          - Create post
GET    /api/{tenant}/posts          - List posts
GET    /api/{tenant}/posts/{slug}   - Get single post
PUT    /api/{tenant}/posts/{slug}   - Update post
DELETE /api/{tenant}/posts/{slug}   - Delete post
GET    /api/{tenant}/drafts         - List drafts
```

**Current Mycelium Tools:** 6 tools implemented
- `lattice_posts_list`, `lattice_post_get`, `lattice_post_create`
- `lattice_post_update`, `lattice_post_delete`, `lattice_drafts`

**Gaps:**
- No media upload endpoint exposed
- No post scheduling API
- No tag/category management
- No bulk operations

**Quality:** Good - Core CRUD works. Ready for CLI wrapper.

---

### Heartwood (Authentication)

**Current API Endpoints:**
```
GET    /api/auth/sign-in/google     - Start Google OAuth
GET    /api/auth/sign-in/github     - Start GitHub OAuth
GET    /api/auth/session            - Get current session + user
POST   /api/auth/sign-out           - End session
POST   /oauth/authorize             - OAuth authorization
POST   /oauth/token                 - Token exchange
GET    /oauth/userinfo              - User info
```

**Current Mycelium Integration:** OAuth flow for authentication (no tools)

**Gaps:**
- No CLI-friendly auth flow (needs device code flow or API tokens)
- No user management API exposed
- No tenant permission management

**Quality:** Good for OAuth, but needs CLI-friendly additions.

---

### Amber (Storage)

**Current API Endpoints:**
```
POST   /api/upload                  - Upload file
GET    /api/files/{key}             - Download file
GET    /api/files                   - List files
DELETE /api/files/{key}             - Delete file
GET    /api/presign/{key}           - Get presigned URL
GET    /api/usage                   - Get storage usage
```

**Current Mycelium Tools:** 5 tools planned (not implemented)
- `amber_upload`, `amber_download`, `amber_list`, `amber_delete`, `amber_presign`

**Gaps:**
- No bulk upload/download
- No folder operations
- No sync functionality
- No image optimization endpoint

**Quality:** Adequate for MVP, needs enhancement for full CLI.

---

### Rings (Analytics)

**Current API Endpoints:**
```
GET    /api/{tenant}/stats          - Get basic stats
GET    /api/{tenant}/posts/{id}/stats - Post-specific stats
GET    /api/{tenant}/signals        - Get resonance signals
POST   /api/events                  - Record event (internal)
```

**Current Mycelium Tools:** 3 tools planned (not implemented)
- `rings_query`, `rings_events`, `rings_dashboard`

**Gaps:**
- No export functionality
- No custom date ranges
- No comparison tools
- Limited query flexibility

**Quality:** Spec is comprehensive, implementation unknown.

---

### Bloom (Remote Dev)

**Current API Endpoints:**
```
POST   /api/sessions                - Start session
GET    /api/sessions/{id}           - Get session status
DELETE /api/sessions/{id}           - Stop session
POST   /api/sessions/{id}/tasks     - Submit task
GET    /api/sessions/{id}/logs      - Get logs
```

**Current Mycelium Tools:** 5 tools planned (not implemented)
- `bloom_session_start`, `bloom_session_status`, `bloom_session_stop`
- `bloom_task_submit`, `bloom_logs`

**Gaps:**
- No project management API
- No config management
- No cost tracking API
- No workspace sync commands

**Quality:** Spec is detailed. API surface appropriate.

---

### Meadow (Social)

**Current API Endpoints:**
```
GET    /api/feed                    - Get feed
POST   /api/vote                    - Vote on post
POST   /api/reaction                - React to post
GET    /api/bookmarks               - Get bookmarks
POST   /api/bookmark                - Add bookmark
```

**Current Mycelium Tools:** 4 tools planned (not implemented)
- `meadow_post`, `meadow_feed`, `meadow_following`, `meadow_followers`

**Gaps:**
- No direct posting API (posts come from Lattice)
- Limited discovery features
- No DM/messaging API

**Quality:** Good spec, straightforward API.

---

## 3. grove-find Analysis: CLI-First + Agent Mode Pattern

### Key Pattern Elements

The `grove-find.sh` script demonstrates the CLI-first + agent mode pattern:

#### 1. **CLI-First Functions**
All operations are shell functions that work from the command line:
```bash
gf "pattern"        # General search
gfc "ClassName"     # Find class/component
gff "function"      # Find function definition
gfi "module"        # Find imports
```

#### 2. **Agent Mode via Environment Variable**
```bash
# Agent mode disables colors for clean output
if [ -n "$GF_AGENT" ]; then
    RED="" GREEN="" YELLOW="" BLUE="" PURPLE="" CYAN="" NC=""
fi
```

#### 3. **Condensed Agent Reference**
The `gfagent` function provides a compact, copy-paste friendly reference:
```bash
gfagent() {
    if [ -z "$GF_AGENT" ]; then
        # Decorated output for humans
    else
        # Plain output for agents
    fi
}
```

#### 4. **Tool Discovery**
Binary discovery that works across different systems:
```bash
_grove_find_binary() {
    local search_paths=(
        "/opt/homebrew/bin"
        "/usr/local/bin"
        "$HOME/.local/bin"
        # ...
    )
}
```

#### 5. **Fallback Support**
Graceful degradation when tools aren't available:
```bash
_grove_fd() {
    if [ -n "$GROVE_FD" ]; then
        "$GROVE_FD" "$@"
    else
        # Fallback to find
    fi
}
```

### Applying This Pattern to Mycelium

The `grove` CLI should follow this same pattern:

```bash
# CLI-first commands
grove lattice posts list
grove lattice post create --title "My Post"
grove amber upload ./image.png
grove bloom start --project lattice

# Agent mode
GROVE_AGENT=1 grove lattice posts list  # Clean JSON output

# Quick reference for agents
grove agent-help
```

---

## 4. Package Name Availability

### npm

| Package | Status | Notes |
|---------|--------|-------|
| `grove` | Taken | Inactive (v0.4.0, old deps) |
| `grove-cli` | Taken | Git worktree manager (prototype) |
| `@grove/cli` | **Available** | Requires org ownership |
| `@autumnsgrove/cli` | **Available** | Under your org |
| `@autumnsgrove/grove` | **Available** | Under your org |
| `@groveengine/cli` | **Available** | Under your org - **Recommended** |
| `@groveengine/grove` | **Available** | Alternative |
| `mycelium` | Unpublished | Was unpublished June 2025 |

### PyPI

| Package | Status | Notes |
|---------|--------|-------|
| `grove` | Taken | HashiCorp security (SaaS log collection) |
| `grove-cli` | Unknown | Blocked by JS challenge |
| `mycelium` | Taken | Luigi workflow library |

### Recommendation

**Use `@groveengine/cli`** for npm. This:
- Is under your existing org
- Provides a clean `npx @groveengine/cli` or `npm install -g @groveengine/cli` workflow
- Aligns with `@autumnsgrove/groveengine` package pattern
- Command can still be `grove` via package.json bin

If Python is chosen, use `grove-cli` or `groveengine-cli` on PyPI.

---

## 5. Language Recommendation

### Analysis

| Factor | TypeScript | Python |
|--------|------------|--------|
| **Existing ecosystem** | All Grove Workers/APIs are TypeScript | Only Mycelium is Python |
| **Code sharing** | Can share types/clients with Workers | Separate implementations needed |
| **MCP SDK** | @modelcontextprotocol/sdk (good) | FastMCP (easier, but less integrated) |
| **CLI frameworks** | Commander, yargs, oclif | Click, Typer |
| **Developer comfort** | Grove-native | Autumn's preference |
| **Cloudflare integration** | Native Workers support | None |
| **Build complexity** | More complex (bundling) | Simpler (pip install) |

### Recommendation: **TypeScript**

**Rationale:**

1. **Ecosystem alignment**: All Grove APIs are TypeScript. Writing the CLI in TypeScript means:
   - Shared type definitions across CLI, MCP, and Workers
   - One language for the entire stack
   - Easier maintenance

2. **Code sharing**: Service clients can be shared between CLI and MCP server:
   ```typescript
   // core/services/lattice.ts - shared by both CLI and MCP
   export class LatticeClient {
     async createPost(tenant: string, data: PostData): Promise<Post>
   }
   ```

3. **MCP server can import CLI logic directly**:
   ```typescript
   // mcp/tools/lattice.ts
   import { LatticeClient } from '../core/services/lattice';

   this.server.tool("lattice_post_create", schema, async (params) => {
     const client = new LatticeClient(this.props.sessionToken);
     return client.createPost(params.tenant, params);
   });
   ```

4. **Modern CLI tooling**: oclif or Commander.js provide excellent TypeScript support with:
   - Automatic help generation
   - Plugin architecture
   - JSON output mode (for agent consumption)

**Migration Path:**
- Current Mycelium MCP code (TypeScript) can be refactored in place
- Extract service clients to `core/services/`
- Build CLI entry point in `cli/`
- MCP server becomes a thin wrapper

---

## 6. Comprehensive TODO List for Phase 2

### Architecture Setup

- [ ] Create new project structure:
  ```
  mycelium/
    cli/
      commands/        # Individual command implementations
      index.ts         # CLI entry point
    mcp/
      server.ts        # MCP server (thin wrapper)
      tools.ts         # MCP tool definitions
    core/
      services/        # Shared service clients
      types.ts         # Shared type definitions
      auth.ts          # Auth utilities
  ```
- [ ] Set up CLI framework (Commander.js or oclif)
- [ ] Implement `--json` output flag for agent mode
- [ ] Add `GROVE_AGENT=1` environment variable support

### Core Service Clients (Priority 1)

#### Lattice Client
- [ ] `grove lattice posts list [--tenant] [--status] [--limit]`
- [ ] `grove lattice post get <slug> [--tenant]`
- [ ] `grove lattice post create --title <title> [--content] [--status]`
- [ ] `grove lattice post update <slug> [--title] [--content] [--status]`
- [ ] `grove lattice post delete <slug>`
- [ ] `grove lattice drafts [--tenant]`
- [ ] `grove lattice media upload <file>`
- [ ] `grove lattice media list`

#### Amber Client
- [ ] `grove amber upload <file> [--path]`
- [ ] `grove amber download <key> [--output]`
- [ ] `grove amber list [--prefix] [--limit]`
- [ ] `grove amber delete <key>`
- [ ] `grove amber presign <key> [--expires]`
- [ ] `grove amber usage`
- [ ] `grove amber sync <local-dir> <remote-prefix>` (future)

#### Heartwood Client
- [ ] `grove auth login` (browser-based OAuth flow)
- [ ] `grove auth login --device` (device code flow for CLI)
- [ ] `grove auth logout`
- [ ] `grove auth status`
- [ ] `grove auth token` (show current token)
- [ ] `grove whoami`

#### Rings Client
- [ ] `grove rings stats [--tenant]`
- [ ] `grove rings post <post-id> [--tenant]`
- [ ] `grove rings signals [--tenant]`
- [ ] `grove rings export [--format csv|json]`

### Extended Service Clients (Priority 2)

#### Bloom Client
- [ ] `grove bloom start [--project] [--region] [--task]`
- [ ] `grove bloom status [session-id]`
- [ ] `grove bloom stop [session-id]`
- [ ] `grove bloom task <task-description>`
- [ ] `grove bloom logs [session-id] [--follow]`
- [ ] `grove bloom projects list`

#### Meadow Client
- [ ] `grove meadow feed [--sort popular|hot|new]`
- [ ] `grove meadow bookmarks`
- [ ] `grove meadow bookmark <post-url>`
- [ ] `grove meadow vote <post-url> [up|down]`

### MCP Wrapper

- [ ] Refactor MCP server to use CLI service clients
- [ ] Map each CLI command to MCP tool:
  ```typescript
  // Example mapping
  "lattice_posts_list" -> LatticeClient.listPosts()
  "amber_upload"       -> AmberClient.upload()
  ```
- [ ] Maintain session state in MCP (active tenant, project, etc.)
- [ ] Add MCP-specific context tools (`mycelium_context`, etc.)

### Authentication

- [ ] Implement device code OAuth flow for CLI
- [ ] Secure credential storage (keychain/credential manager)
- [ ] Token refresh handling
- [ ] Multi-account support (future)

### Agent Mode

- [ ] `--json` flag for machine-readable output
- [ ] `--quiet` flag for minimal output
- [ ] `GROVE_AGENT=1` environment variable
- [ ] `grove agent-help` condensed reference
- [ ] Clean exit codes (0 success, 1 error, 2 auth required)

### Configuration

- [ ] `grove config init` - interactive setup
- [ ] `grove config set <key> <value>`
- [ ] `grove config get <key>`
- [ ] `grove config list`
- [ ] Support for `~/.grove/config.json` or `~/.groverc`
- [ ] Environment variable overrides

### Documentation

- [ ] CLI help text for all commands
- [ ] Man pages (optional)
- [ ] `grove --help` comprehensive help
- [ ] README with quick start guide

### Testing

- [ ] Unit tests for service clients
- [ ] Integration tests for CLI commands
- [ ] E2E tests for MCP server
- [ ] Mock API responses for offline testing

### Packaging & Distribution

- [ ] Publish to npm as `@groveengine/cli`
- [ ] Set up GitHub releases
- [ ] Create Homebrew formula (optional)
- [ ] Add to Claude Desktop MCP config example

---

## 7. Target Architecture (Phase 2)

```
mycelium/
├── cli/
│   ├── commands/
│   │   ├── lattice/
│   │   │   ├── posts.ts       # grove lattice posts ...
│   │   │   ├── media.ts       # grove lattice media ...
│   │   │   └── index.ts
│   │   ├── amber/
│   │   │   ├── upload.ts
│   │   │   ├── download.ts
│   │   │   └── index.ts
│   │   ├── bloom/
│   │   │   └── ...
│   │   ├── rings/
│   │   │   └── ...
│   │   ├── meadow/
│   │   │   └── ...
│   │   ├── auth.ts            # grove auth ...
│   │   └── config.ts          # grove config ...
│   └── index.ts               # CLI entry point
├── mcp/
│   ├── server.ts              # McpAgent wrapper
│   └── tools.ts               # Tool definitions -> CLI commands
├── core/
│   ├── services/
│   │   ├── lattice.ts         # Lattice API client
│   │   ├── amber.ts           # Amber API client
│   │   ├── bloom.ts           # Bloom API client
│   │   ├── rings.ts           # Rings API client
│   │   ├── meadow.ts          # Meadow API client
│   │   └── heartwood.ts       # Auth client
│   ├── types.ts               # Shared type definitions
│   └── config.ts              # Configuration management
├── package.json
├── tsconfig.json
└── README.md
```

---

## 8. Migration Strategy

### Step 1: Extract Service Clients
Move API interaction logic from current MCP tools into shared clients:
```typescript
// Before: src/tools/lattice.ts (MCP-specific)
this.server.tool("lattice_post_create", ..., async (params) => {
  const response = await fetch(`https://lattice.grove.place/api/...`);
  // ...
});

// After: core/services/lattice.ts (shared)
export class LatticeClient {
  async createPost(tenant: string, data: PostData): Promise<Post> {
    const response = await fetch(`https://lattice.grove.place/api/...`);
    // ...
  }
}
```

### Step 2: Build CLI Layer
Create CLI commands that use the shared clients:
```typescript
// cli/commands/lattice/posts.ts
import { LatticeClient } from '../../core/services/lattice';

export const createPostCommand = new Command('create')
  .option('--title <title>')
  .option('--content <content>')
  .action(async (options) => {
    const client = new LatticeClient(await getAuthToken());
    const post = await client.createPost(getTenant(), options);
    console.log(JSON.stringify(post, null, 2));
  });
```

### Step 3: Rewire MCP Server
MCP server becomes a thin wrapper:
```typescript
// mcp/tools.ts
import { LatticeClient } from '../core/services/lattice';

export function registerLatticeTools(server: McpServer, auth: AuthProps) {
  const client = new LatticeClient(auth.sessionToken);

  server.tool("lattice_post_create", schema, async (params) => {
    const post = await client.createPost(params.tenant, params);
    return formatMcpResponse(post);
  });
}
```

---

## 9. Open Questions for Phase 2

1. **Authentication storage**: Use system keychain, config file, or environment variable?
2. **Default tenant**: Should CLI remember last-used tenant?
3. **Offline mode**: Cache any data locally for offline access?
4. **Plugin system**: Allow third-party extensions?
5. **Interactive mode**: REPL-style interface?

---

## Conclusion

Phase 1 exploration is complete. The Grove ecosystem has a well-documented set of services with varying levels of API maturity. The `grove-find` pattern provides an excellent template for CLI-first + agent mode design.

**Recommended next steps:**
1. Create new project structure in Mycelium repo
2. Extract Lattice client as proof of concept
3. Build `grove lattice` CLI commands
4. Refactor MCP server to use shared client
5. Iterate on other services

**Time estimate:** This is a significant refactor. Recommend breaking into incremental PRs:
- PR 1: Project restructure + Lattice client
- PR 2: CLI framework + `grove lattice` commands
- PR 3: MCP refactor to use clients
- PR 4: Amber + Heartwood
- PR 5: Bloom + Rings + Meadow
