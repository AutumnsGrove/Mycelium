# Mycelium

> *The wood wide web of the Grove ecosystem*

**Mycelium** is Grove's Model Context Protocol (MCP) server - the communication network that lets AI agents (Claude) interact with the entire Grove ecosystem. Just as fungal mycelium networks connect trees in a forest, Mycelium connects Claude to Lattice, Heartwood, Amber, Bloom, and every other Grove service.

**One sentence:** *"Claude talks to Grove through Mycelium."*

---

## Features

- **McpAgent on Durable Objects** - Each MCP session is a globally unique, persistent Durable Object
- **Heartwood OAuth** - Integrated with Grove's existing auth infrastructure
- **Multi-transport support** - Streamable HTTP, SSE, and WebSocket
- **Full Grove integration** - Tools for all Grove services

## MCP Tools

| Service | Tools |
|---------|-------|
| **Lattice** (Blogging) | Create, read, update, delete blog posts |
| **Bloom** (Remote Dev) | Start/stop coding sessions, submit tasks |
| **Amber** (Storage) | Upload, download, list files in R2 |
| **Rings** (Analytics) | Query metrics, view events, dashboards |
| **Meadow** (Social) | Post, view feed, manage follows |
| **Scout** (Deals) | Search deals, track prices, get alerts |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Cloudflare account
- Heartwood OAuth credentials

### Installation

```bash
# Clone and install
git clone https://github.com/AutumnsGrove/Mycelium.git
cd Mycelium
pnpm install

# Configure Cloudflare
npx wrangler kv namespace create "OAUTH_KV"
npx wrangler secret put HEARTWOOD_CLIENT_ID
npx wrangler secret put HEARTWOOD_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Update wrangler.jsonc with your KV namespace ID
```

### Development

```bash
# Start local dev server
pnpm dev

# Run type checking
pnpm typecheck

# Deploy to production
pnpm deploy
```

---

## Connecting to Claude

### Claude.ai (Connectors)

1. **Settings** -> **Connectors** -> **Add custom connector**
2. **URL:** `https://mycelium.grove.place/mcp`
3. Authenticate via Heartwood
4. Enable desired tools

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Claude Code

Add to MCP server configuration or use via Claude.ai connectors.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MCP CLIENTS                                       │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Claude.ai  │  │ Claude Desktop  │  │ Claude Code │  │   Cursor    │    │
│  └──────┬──────┘  └────────┬────────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │         SSE / Streamable HTTP / WebSocket              │
          └──────────────────┴─────────┬────────┴──────────────────┘
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                     MYCELIUM (Cloudflare Worker)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MyceliumDO (Durable Object per Session)          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │  Session State  │  │  SQLite Storage │  │   Hibernation   │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                          GROVE ECOSYSTEM                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Lattice  │  │ Heartwood │  │   Amber   │  │   Bloom   │  │   Rings   │ │
│  │  (blogs)  │  │  (auth)   │  │ (storage) │  │ (dev env) │  │(analytics)│ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
mycelium/
├── src/
│   ├── index.ts              # Main entry, exports Mycelium class
│   ├── types.ts              # Shared type definitions
│   ├── tools/                # MCP tool implementations
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

## Development Status

**Current Phase:** Phase 0 - Scaffolding Complete

- [x] Project structure
- [x] Configuration files
- [x] Type definitions
- [x] Tool stubs (all 7 groups)
- [x] Auth handler stub
- [x] State management stubs
- [ ] Phase 1: Foundation (MVP)
- [ ] Phase 2: Bloom Integration
- [ ] Phase 3: Full Ecosystem
- [ ] Phase 4: Advanced Features

See `TODOS.md` for detailed task tracking.

---

## Cost Analysis

| Resource | Free Tier | Expected Usage |
|----------|-----------|----------------|
| Worker Requests | 100K/day | ~1K/day |
| Durable Objects | 1M req/month | ~30K/month |
| DO Storage | 1 GB | ~10 MB |
| KV Operations | 100K/day | ~100/day |

**Estimated monthly cost: $0** (free tier sufficient for personal use)

---

## References

- [Cloudflare MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [McpAgent API Reference](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude Connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)

---

*"The forest speaks through its roots."*

**Author:** Autumn Brown
**Domain:** mycelium.grove.place
**Status:** Phase 0 - Scaffolding
