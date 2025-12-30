# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Project Purpose

**Mycelium** is Grove's Model Context Protocol (MCP) server - the communication network that lets AI agents interact with the entire Grove ecosystem. Built on Cloudflare Workers with Durable Objects.

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Cloudflare Workers
- **Framework:** McpAgent (Durable Objects)
- **Key Libraries:**
  - `@modelcontextprotocol/sdk` - MCP server implementation
  - `@cloudflare/workers-oauth-provider` - OAuth 2.0 support
  - `zod` - Schema validation
  - `agents` - Cloudflare McpAgent base class
- **Package Manager:** pnpm

## Architecture Notes

- **Each MCP session is a Durable Object** with persistent SQLite storage
- **Heartwood OAuth integration** for authentication
- **Transport support**: Streamable HTTP (`/mcp`), SSE (`/sse`), WebSocket
- **Tool groups**: Lattice (blogs), Bloom (dev), Amber (storage), Rings (analytics), Meadow (social), Scout (deals)

---

## Essential Instructions (Always Follow)

### Core Behavior
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested

### Naming Conventions
- **Directories**: Use CamelCase (e.g., `VideoProcessor`, `AudioTools`, `DataAnalysis`)
- **Date-based paths**: Use skewer-case with YYYY-MM-DD (e.g., `logs-2025-01-15`, `backup-2025-12-31`)
- **No spaces or underscores** in directory names (except date-based paths)

### TODO Management
- **Always check `TODOS.md` first** when starting a task or session
- **Update immediately** when tasks are completed, added, or changed
- Keep the list current and manageable

### Git Workflow Essentials

**After completing major changes, you MUST commit your work.**

**Conventional Commits Format:**
```bash
<type>: <brief description>

<optional body>
```

**Common Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```bash
feat: Add user authentication
fix: Correct timezone bug
docs: Update README
```

**For complete details:** See `AgentUsage/git_guide.md`

---

## Project Structure

```
mycelium/
├── src/
│   ├── index.ts              # Main entry, exports Mycelium class
│   ├── types.ts              # Shared type definitions
│   ├── tools/
│   │   ├── lattice.ts        # Blog tools
│   │   ├── bloom.ts          # Remote dev tools
│   │   ├── amber.ts          # Storage tools
│   │   ├── rings.ts          # Analytics tools
│   │   ├── meadow.ts         # Social tools
│   │   ├── scout.ts          # Deal finding tools
│   │   └── context.ts        # Session management tools
│   ├── auth/
│   │   └── heartwood.ts      # OAuth handler
│   └── state/
│       ├── schema.ts         # State type definitions
│       └── migrations.ts     # SQL migrations
├── docs/
│   ├── SPEC.md               # Full project specification
│   └── grove-mcp-guide.md    # MCP implementation guide
├── tests/                    # Test files
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

---

## MCP Tools Reference

| Tool Group | Tools |
|------------|-------|
| **Lattice** | `lattice_posts_list`, `lattice_post_get`, `lattice_post_create`, `lattice_post_update`, `lattice_post_delete`, `lattice_drafts` |
| **Bloom** | `bloom_session_start`, `bloom_session_status`, `bloom_session_stop`, `bloom_task_submit`, `bloom_logs` |
| **Amber** | `amber_upload`, `amber_download`, `amber_list`, `amber_delete`, `amber_presign` |
| **Rings** | `rings_query`, `rings_events`, `rings_dashboard` |
| **Meadow** | `meadow_post`, `meadow_feed`, `meadow_following`, `meadow_followers` |
| **Scout** | `scout_search`, `scout_track`, `scout_alerts` |
| **Context** | `mycelium_context`, `mycelium_set_tenant`, `mycelium_set_project`, `mycelium_preferences`, `mycelium_history` |

---

## When to Use Skills

**This project uses Claude Code Skills for specialized workflows. Invoke skills using the Skill tool when you encounter these situations:**

### Cloudflare Development
- **When deploying to Cloudflare** -> Use skill: `cloudflare-deployment`
- **Before using Cloudflare Workers, KV, R2, or D1** -> Use skill: `cloudflare-deployment`

### Version Control
- **Before making a git commit** -> Use skill: `git-workflows`
- **For git workflow and branching** -> Use skill: `git-workflows`

### Testing
- **Before writing TypeScript tests** -> Use skill: `javascript-testing`

### Code Quality
- **When formatting or linting code** -> Use skill: `code-quality`

### API Integration
- **When integrating with Grove APIs** -> Use skill: `api-integration`

---

## Quick Reference

### Development Commands

```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

### Cloudflare Setup

```bash
# Create KV namespace for OAuth
npx wrangler kv namespace create "OAUTH_KV"

# Set secrets
npx wrangler secret put HEARTWOOD_CLIENT_ID
npx wrangler secret put HEARTWOOD_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

### Connecting Clients

**Claude.ai Connectors:**
- URL: `https://mycelium.grove.place/mcp`

**Claude Desktop:**
```json
{
  "mcpServers": {
    "grove": {
      "command": "npx",
      "args": ["mcp-remote", "https://mycelium.grove.place/sse"]
    }
  }
}
```

---

## Security Basics
- Store secrets via `wrangler secret put` (NEVER commit)
- OAuth tokens stored in encrypted KV
- All tool calls logged for audit
- Tenant isolation enforced per-tool

---

## Additional Resources

### Skills Documentation
Skills are the primary way to access specialized knowledge. Use the Skill tool to invoke them.

### Extended Documentation
For in-depth reference beyond what skills provide, see:
**`AgentUsage/README.md`** - Master index of detailed documentation

### Project Specifications
- **`docs/SPEC.md`** - Full Mycelium specification
- **`docs/grove-mcp-guide.md`** - MCP implementation guide

---

*Last updated: 2025-12-30*
*Model: Claude Opus 4.5*
