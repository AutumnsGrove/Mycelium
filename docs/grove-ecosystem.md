# Grove Ecosystem Overview

> Reference document for Mycelium tool development

This document catalogs all Grove services that Mycelium connects to, their domains, APIs, and integration priorities.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MYCELIUM                                        │
│                        mycelium.grove.place                                  │
│                     (MCP Server - Durable Objects)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   CORE        │         │   WORKSHOP    │         │    BEYOND     │
│   PLATFORM    │         │   SERVICES    │         │   THE GROVE   │
├───────────────┤         ├───────────────┤         ├───────────────┤
│ Lattice       │         │ Foliage       │         │ Scout         │
│ Heartwood     │         │ Ivy           │         │ Aria          │
│ Amber         │         │ Forage        │         │ Trove         │
│ Rings         │         │ Outpost       │         │ Daily Clearing│
│ Meadow        │         │ Nook          │         │               │
│ Bloom         │         │ Cache         │         │               │
└───────────────┘         └───────────────┘         └───────────────┘
```

---

## Multi-Tenant Architecture

Grove uses a **subdomain-based multi-tenant model**:

- **Single deployment**: All tenants run on one `groveengine` Pages deployment
- **Subdomain routing**: `dave.grove.place` → lookup tenant `dave` in D1
- **User = Tenant Owner**: Matched by `owner_email` field
- **Shared session**: Cookie on `.grove.place` domain via Heartwood

**Storage organization:**
- **D1**: Posts, pages, tenant config (shared database, tenant-scoped queries)
- **R2**: Media at `tenants/{tenant_id}/media/...`
- **KV**: Cached data with tenant-prefixed keys

---

## Core Platform Services

### Lattice (GroveEngine)
> Core blog engine powering every Grove site

| | |
|-|-|
| **Domain** | `*.grove.place` (tenant subdomains) |
| **Stack** | SvelteKit, Cloudflare D1/KV/R2 |
| **Package** | `@grove/engine` (npm) |
| **Mycelium Phase** | 1 |

**Features:**
- Markdown posts with frontmatter
- Draft/published/archived states
- Tags, reading time, TOC generation
- Media uploads to R2

**Key API Endpoints:**
- `GET /api/posts` - List posts
- `GET /api/posts/:slug` - Get post
- `POST /api/posts` - Create post
- `PUT /api/posts/:slug` - Update post
- `DELETE /api/posts/:slug` - Delete post

---

### Heartwood (GroveAuth)
> Centralized authentication for the Grove ecosystem

| | |
|-|-|
| **Domain** | `heartwood.grove.place` |
| **Stack** | Cloudflare Workers, D1, KV |
| **Mycelium Phase** | 1 (OAuth provider) |

**Features:**
- OAuth 2.0 + PKCE provider
- Magic code (passwordless) login
- Google/GitHub social login
- Session management across `.grove.place`

**OAuth Scopes:**
| Scope | Description |
|-------|-------------|
| `profile` | Basic user info (id, email) |
| `tenants:read` | List user's tenants |
| `tenants:write` | Create/modify tenant content |
| `bloom:read` | View Bloom sessions |
| `bloom:write` | Start/stop Bloom sessions |
| `amber:read` | Download from storage |
| `amber:write` | Upload to storage |
| `meadow:read` | View social feed |
| `meadow:write` | Post to Meadow |

---

### Rings (Analytics)
> Writer-focused analytics - private, delayed, no vanity metrics

| | |
|-|-|
| **Domain** | Integrated into Lattice |
| **Stack** | D1 aggregations |
| **Mycelium Phase** | 1 |

**Philosophy:**
- All stats delayed 24 hours (no real-time anxiety)
- No public counts or leaderboards
- Resonance indicators (🌱🌿🌳) after 7 days
- Wellness tools: Digest Mode, Focus Periods

**Metrics:**
| Metric | Definition |
|--------|------------|
| Engaged Readers | 60%+ reading time AND reached end |
| Deep Reads | Meaningful time regardless of completion |
| Finish Rate | % scrolled to bottom |
| Return Readers | Logged-in users returning within 30 days |
| Steady Readers | 3+ posts read total |

**Tiers:**
- **Seedling** ($8/mo): View counts on recent posts
- **Sapling** ($12/mo): Engagement metrics + Resonance
- **Oak** ($25/mo): Full insights, export, wellness
- **Evergreen** ($35/mo): Max customization, 1-5yr retention

**Key API Endpoints:**
- `POST /api/rings/pageview` - Track visit
- `POST /api/rings/reading` - Log engagement
- `GET /api/rings/posts/:postId` - Post analytics
- `GET /api/rings/overview` - Blog summary
- `GET /api/rings/export` - Data export (Oak+)

---

### Meadow (Social)
> Community feed, voting, and social discovery

| | |
|-|-|
| **Domain** | `meadow.grove.place` |
| **Stack** | Cloudflare Workers, D1, KV |
| **Mycelium Phase** | 1 |

**Features:**
- Opt-in post sharing (private by default)
- HN-style voting (scores hidden)
- Emoji reactions (5 generic + 100 Emoji Kitchen)
- Feed sorting: chronological, popular, hot, top

**Key API Endpoints:**
- `GET /api/feed` - Get feed with sorting
- `POST /api/posts/:id/vote` - Upvote/downvote
- `DELETE /api/posts/:id/vote` - Remove vote
- `POST /api/posts/:id/reactions` - Add reaction
- `GET /api/following` - List following
- `GET /api/followers` - List followers

---

### Amber (Storage)
> Unified storage management for Grove

| | |
|-|-|
| **Domain** | `amber.grove.place` |
| **Stack** | Cloudflare Workers, R2 |
| **Mycelium Phase** | 2 |

**Features:**
- Storage usage dashboard
- File organization and browsing
- Export/download capabilities
- Storage quota purchases

**Key API Endpoints:**
- `POST /api/upload` - Upload file
- `GET /api/files` - List files
- `GET /api/files/:path` - Download file
- `DELETE /api/files/:path` - Delete file
- `GET /api/presign/:path` - Presigned URL
- `GET /api/usage` - Storage stats

---

### Bloom (Remote Dev)
> Serverless autonomous coding infrastructure

| | |
|-|-|
| **Domain** | `bloom.grove.place` |
| **Stack** | SvelteKit, Cloudflare Workers, Hetzner VPS |
| **Mycelium Phase** | 2 |

**Architecture:**
- **Frontend**: SvelteKit on Cloudflare Pages (mobile-first)
- **Orchestrator**: Worker for VPS lifecycle, R2 sync, WebSocket proxy
- **Compute**: Hetzner VPS with Kilo Code CLI + ttyd terminal

**Session Lifecycle:**
```
OFFLINE → PROVISIONING → RUNNING → IDLE → SYNCING → TERMINATING → OFFLINE
```

**Regions:**
| Region | Cost | Latency |
|--------|------|---------|
| EU | ~€0.008/hr | Higher |
| US | ~€0.021/hr | Lower |

**AI Models:** DeepSeek V3.2, GLM 4.6V (via OpenRouter)

**Storage:**
- `bloom-repos` (R2): Pre-cloned repositories
- `bloom-state` (R2): Workspace snapshots, AI context
- D1: Session records, task history

**Key API Endpoints:**
- `POST /api/sessions` - Start session
- `GET /api/sessions/:id` - Session status
- `DELETE /api/sessions/:id` - Stop session
- `POST /api/sessions/:id/tasks` - Submit task
- `GET /api/sessions/:id/logs` - Get logs

---

## Workshop Services

### Foliage (Theming)
> Visual customization and theming system

| | |
|-|-|
| **Domain** | `foliage.grove.place` |
| **Mycelium Phase** | 3 |

**Features:**
- Curated theme gallery
- Custom theme builder
- CSS variable customization
- Preview before applying

---

### Ivy (Email)
> Zero-knowledge mail client for @grove.place

| | |
|-|-|
| **Domain** | `ivy.grove.place` |
| **Included** | Oak and Evergreen tiers |
| **Mycelium Phase** | 3 |

**Features:**
- Client-side encryption
- Threaded conversations
- Rich text composition
- @grove.place addresses

---

### Forage (Domains)
> AI-powered domain discovery

| | |
|-|-|
| **Domain** | `forage.grove.place` |
| **Mycelium Phase** | 3 |

**Features:**
- Natural language domain search
- Availability checking
- Alternative suggestions
- Integration with registrars

---

### Outpost (Minecraft)
> On-demand Minecraft servers

| | |
|-|-|
| **Domain** | `mc.grove.place` |
| **Mycelium Phase** | 3 |

**Features:**
- Start/stop servers on demand
- Auto-shutdown after idle
- Whitelist management
- World backups

---

### Nook (Video)
> Private video sharing platform

| | |
|-|-|
| **Domain** | `nook.grove.place` |
| **Mycelium Phase** | 4 |

**Features:**
- Intimate sharing with close connections
- Privacy-first design
- No public feeds

---

### Cache (Backups)
> Automated backup infrastructure

| | |
|-|-|
| **Domain** | Internal service |
| **Mycelium Phase** | 4 |

**Features:**
- Weekly automated D1 backups
- 12-week retention history
- Disaster recovery

---

## Beyond the Grove

### Scout (Deals)
> Swarming search for shopping research

| | |
|-|-|
| **Domain** | `scout.grove.place` |
| **Stack** | Python + TypeScript |
| **Repo** | `AutumnsGrove/GroveScout` |
| **Mycelium Phase** | 3 |

**Features:**
- Async product research
- Returns "5 perfect matches"
- Price tracking and alerts
- Deal notifications

---

### Aria (Music)
> Music curation via sonic DNA matching

| | |
|-|-|
| **Domain** | `aria.grove.place` |
| **Stack** | Python + SvelteKit |
| **Repo** | `AutumnsGrove/GroveMusic` |
| **Status** | Early Research |
| **Mycelium Phase** | 3 |

**Features:**
- Playlists by sonic/emotional connections
- Not genre-based matching
- Discovery through audio analysis

---

### Trove (Library)
> Library book discovery tool

| | |
|-|-|
| **Domain** | `trove.grove.place` |
| **Stack** | Python + SvelteKit |
| **Repo** | `AutumnsGrove/TreasureTrove` |
| **Status** | Planned |
| **Mycelium Phase** | 4 |

**Features:**
- Camera-based shelf scanning
- Book identification
- Recommendations from reading history

---

### The Daily Clearing (News)
> AI-powered skeptical news analysis

| | |
|-|-|
| **Domain** | `clearing.grove.place` |
| **Stack** | Python + Cloudflare Workers |
| **Repo** | `AutumnsGrove/AgenticNewspaper` |
| **Status** | Building |
| **Mycelium Phase** | 4 |

**Features:**
- Curated newsletters
- Cuts through noise
- Skeptical analysis

---

## Mycelium Tool Roadmap

### Phase 1: Foundation
- `lattice_*` - Blog posts, drafts, pages
- `rings_*` - Analytics, resonance
- `meadow_*` - Feed, voting, reactions
- `mycelium_*` - Context, preferences

### Phase 2: Storage & Dev
- `amber_*` - File management
- `bloom_*` - Remote coding sessions

### Phase 3: Extended Services
- `foliage_*` - Theming
- `ivy_*` - Email
- `forage_*` - Domain search
- `outpost_*` - Minecraft servers
- `scout_*` - Deal finding
- `aria_*` - Music playlists

### Phase 4: Future
- `nook_*` - Private video
- `trove_*` - Book discovery
- `clearing_*` - News curation
- `cache_*` - Backup management

---

## References

- [GroveEngine Specs](https://github.com/AutumnsGrove/GroveEngine/tree/main/docs/specs)
- [Multi-Tenant Architecture](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/multi-tenant-architecture.md)
- [GroveBloom](https://github.com/AutumnsGrove/GroveBloom)
- [Workshop Roadmap](https://grove.place/roadmap/workshop)
- [Beyond the Grove](https://grove.place/roadmap/beyond)

---

*Last updated: 2025-12-30*
