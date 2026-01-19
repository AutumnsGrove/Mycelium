# Mycelium: Resume Phase 2 - CLI-First Architecture Refactor

## Context

Phase 1 is complete. We've done a comprehensive audit of all Grove services and have a clear roadmap. Now it's time to implement.

**Read these files first:**
- `docs/PHASE1-CLI-REFACTOR-AUDIT.md` - Full audit with service status, API gaps, and TODO list
- `docs/agent-prompts/mycelium-cli-init.md` - Detailed CLI initialization spec

## What's Been Decided

| Decision | Choice |
|----------|--------|
| **Package** | `@groveengine/cli` |
| **CLI command** | `grove` |
| **Language** | TypeScript |
| **CLI framework** | Commander.js |
| **Auth storage** | Keychain → env var → config file |
| **Default tenant** | CLI remembers last-used |
| **Agent mode** | `--json` flag or `GROVE_AGENT=1` |
| **Interactive mode** | Optional flag, not default |
| **Plugins** | Scoped for Phase 3+ |

## Current State

- Mycelium exists as an MCP server (TypeScript, Cloudflare Workers)
- No CLI exists yet
- Service clients are embedded in MCP tools (need extraction)

## Phase 2 Implementation Order

### Step 1: Project Structure
Create the CLI-first directory structure:
```
mycelium/
├── cli/
│   ├── commands/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── lattice/
│   │   ├── amber/
│   │   ├── bloom/
│   │   └── foliage/
│   ├── utils/
│   │   ├── output.ts
│   │   ├── auth.ts
│   │   └── config.ts
│   └── index.ts
├── core/
│   ├── services/
│   │   ├── heartwood.ts
│   │   ├── lattice.ts
│   │   ├── amber.ts
│   │   ├── bloom.ts
│   │   └── foliage.ts
│   └── types.ts
├── mcp/                 # Keep existing, refactor to use core/
└── package.json
```

### Step 2: Package.json Updates
```json
{
  "name": "@groveengine/cli",
  "bin": {
    "grove": "./dist/cli/index.js"
  },
  "scripts": {
    "build:cli": "tsc -p tsconfig.cli.json",
    "dev:cli": "tsx cli/index.ts"
  }
}
```

New dependencies:
- `commander` - CLI framework
- `keytar` - System keychain
- `chalk` - Colors
- `ora` - Spinners
- `cli-table3` - Tables

### Step 3: Core Service Clients
Extract API logic into reusable clients:

```typescript
// core/services/lattice.ts
export class LatticeClient {
  constructor(private token: string, private tenant: string) {}

  async listPosts(options?: ListOptions): Promise<Post[]>
  async getPost(slug: string): Promise<Post>
  async createPost(data: CreatePostData): Promise<Post>
  async updatePost(slug: string, data: UpdatePostData): Promise<Post>
  async deletePost(slug: string): Promise<void>
}
```

### Step 4: CLI Framework
```typescript
// cli/index.ts
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command()
  .name('grove')
  .description('CLI for the Grove ecosystem')
  .version('0.1.0')
  .option('--json', 'Output as JSON')
  .option('--tenant <name>', 'Override default tenant');

// Register commands
program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(latticeCommand);

program.parse();
```

### Step 5: Implement Commands (Priority Order)

1. **Config commands** (no auth needed)
   - `grove config tenant [name]`
   - `grove config list`

2. **Auth commands** (can stub initially)
   - `grove login --token <token>` (manual token entry)
   - `grove logout`
   - `grove whoami`

3. **Lattice commands** (core functionality)
   - `grove lattice posts list`
   - `grove lattice posts get <slug>`
   - `grove lattice posts create`
   - `grove lattice posts delete <slug>`

4. **Amber commands**
   - `grove amber list`
   - `grove amber upload <file>`
   - `grove amber download <key>`

5. **Bloom/Foliage commands** (when APIs ready)

### Step 6: MCP Refactor
Once CLI works, refactor MCP to use same service clients:

```typescript
// mcp/tools/lattice.ts
import { LatticeClient } from '../core/services/lattice';

export function registerLatticeTools(server: McpServer, auth: AuthProps) {
  const client = new LatticeClient(auth.token, state.activeTenant);

  server.tool("lattice_posts_list", schema, async (params) => {
    const posts = await client.listPosts(params);
    return formatMcpResponse(posts);
  });
}
```

## Blocking Dependencies (External Repos)

These are being worked on in parallel:

| Dependency | Repo | Status | Workaround |
|------------|------|--------|------------|
| Device code auth | GroveAuth | Pending | Use `--token` flag |
| File upload | Amber | Pending | Skip upload command |
| Expanded API | GroveEngine | Pending | Use existing endpoints |

## Success Criteria for Phase 2

- [ ] `grove --help` works
- [ ] `grove --version` works
- [ ] `grove config tenant <name>` persists config
- [ ] `grove login --token <token>` saves to keychain
- [ ] `grove whoami` shows user info
- [ ] `grove lattice posts list` fetches and displays posts
- [ ] `grove lattice posts list --json` outputs JSON
- [ ] `GROVE_AGENT=1` enables agent mode globally
- [ ] Service clients shared between CLI and MCP
- [ ] MCP server still works after refactor

## Notes

- Don't break existing MCP functionality during refactor
- Start with Lattice as proof of concept
- Auth can be mocked/manual until Heartwood device code is ready
- Tests can come after core structure works
- Keep commits atomic and pushable

## Commands to Get Started

```bash
# Install new dependencies
pnpm add commander keytar chalk ora cli-table3

# Create directory structure
mkdir -p cli/commands/{auth,config,lattice,amber,bloom,foliage}
mkdir -p cli/utils
mkdir -p core/services

# Start with CLI entry point
# Then config commands (no auth needed)
# Then lattice commands (core use case)
```
